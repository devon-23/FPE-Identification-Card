import { h, raw, layout, htmlResponse, spread } from './_lib/html.js';
import { FORM, SET_SIZE } from './_lib/config.js';
import { cityMark } from './_lib/glyph.js';
import { usState, US_STATES } from './_lib/places.js';

// everything here is one pass over the register, grouped in sql rather than
// in js, so a big night does not mean reading every row into memory

const pc = (n, of) => (of ? Math.round((n / of) * 100) : 0);

function bar(label, n, of, note) {
  return h`<div class="nerd__row">
      <div class="nerd__label">${label}</div>
      <div class="nerd__track"><span style="--w:${String(pc(n, of))}%"></span></div>
      <div class="nerd__n">${String(n)}${raw(note ? h` <i>${note}</i>` : '')}</div>
    </div>`;
}

function table(title, rows, of) {
  if (!rows.length) return '';
  return h`<section class="nerd">
      <h2 class="nerd__head">${title}</h2>
      ${raw(rows.map((r) => String(bar(r.k || '[REDACTED]', r.n, of))).join(''))}
    </section>`;
}

export async function onRequestGet({ env }) {
  const all = env.DB.prepare.bind(env.DB);
  const FILED = "status = 'ESCAPED'";

  const [tally, factions, bishops, years, attempts, towns, labels] = await Promise.all([
    all(`SELECT count(*) filed,
                sum(CASE WHEN attending=1 THEN 1 ELSE 0 END) attending,
                sum(CASE WHEN photo_key IS NOT NULL THEN 1 ELSE 0 END) photos,
                sum(CASE WHEN name_assigned=1 THEN 1 ELSE 0 END) unnamed,
                sum(CASE WHEN lyric IS NOT NULL AND trim(lyric)<>'' THEN 1 ELSE 0 END) lyrics,
                sum(CASE WHEN bio IS NOT NULL AND trim(bio)<>'' THEN 1 ELSE 0 END) statements,
                sum(CASE WHEN handle IS NOT NULL THEN 1 ELSE 0 END) handles,
                sum(CASE WHEN n<=${SET_SIZE} THEN 1 ELSE 0 END) cards
           FROM records WHERE ${FILED}`).first(),
    all(`SELECT faction k, count(*) n FROM records WHERE ${FILED} GROUP BY faction ORDER BY n DESC`).all(),
    all(`SELECT COALESCE(bishop,'[REDACTED]') k, count(*) n FROM records WHERE ${FILED} GROUP BY k ORDER BY n DESC`).all(),
    all(`SELECT first_show k, count(*) n FROM records WHERE ${FILED} AND first_show IS NOT NULL GROUP BY k ORDER BY k`).all(),
    all(`SELECT attempts k, count(*) n FROM records WHERE ${FILED} AND attempts IS NOT NULL GROUP BY k ORDER BY n DESC LIMIT 10`).all(),
    all(`SELECT UPPER(TRIM(hometown)) k, count(*) n FROM records
          WHERE ${FILED} AND hometown IS NOT NULL AND trim(hometown)<>''
          GROUP BY k ORDER BY n DESC LIMIT 12`).all(),
    all(`SELECT p.label, count(*) n FROM records r
           JOIN places p ON p.q = UPPER(TRIM(r.hometown))
          WHERE r.${FILED} AND p.label IS NOT NULL GROUP BY p.label`).all(),
  ]);

  const t = tally || {};
  const filed = t.filed || 0;

  // states have to be counted here -- the state is buried in a free-text
  // label and sqlite is in no position to dig it out
  const byState = new Map();
  for (const row of labels.results || []) {
    const st = usState(row.label);
    if (st) byState.set(st, (byState.get(st) || 0) + row.n);
  }
  const states = [...byState.entries()].sort((a, b) => b[1] - a[1]);
  const missing = US_STATES.filter((s) => !byState.has(s));

  const headline = [
    ['SUBJECTS FILED', String(filed)],
    ['IN THE REGISTER', String(t.attending || 0)],
    ['STATES', `${byState.size}/50`],
    ['CARDS CLAIMED', `${t.cards || 0}/${SET_SIZE}`],
  ].map(([k, v]) => h`<div class="nerd__big"><b>${v}</b><span>${k}</span></div>`).join('');

  const body = h`  <main class="stage doc">
    <p class="doc__letterhead spread">${raw(spread(FORM.letterhead))}</p>
    <div class="doc__seal"><a href="/incident" aria-label="Incident report">${raw(cityMark(0, { allLit: true }))}</a></div>

    <h1 class="doc__title">STATS FOR NERDS</h1>
    <p class="doc__aside">Everything the register knows about itself. Updates as people file.</p>

    <div class="nerd__bigs">${raw(headline)}</div>

    ${raw(String(table('ALLEGIANCE DECLARED', factions.results || [], filed)))}
    ${raw(String(table('ASSIGNED BISHOP', bishops.results || [], filed)))}

    <section class="nerd">
      <h2 class="nerd__head">WHAT PEOPLE FILLED IN</h2>
      ${raw(String(bar('GAVE A PHOTOGRAPH', t.photos || 0, filed, `${pc(t.photos || 0, filed)}%`)))}
      ${raw(String(bar('GAVE A LYRIC', t.lyrics || 0, filed, `${pc(t.lyrics || 0, filed)}%`)))}
      ${raw(String(bar('GAVE A STATEMENT', t.statements || 0, filed, `${pc(t.statements || 0, filed)}%`)))}
      ${raw(String(bar('GAVE A HANDLE', t.handles || 0, filed, `${pc(t.handles || 0, filed)}%`)))}
      ${raw(String(bar('DECLINED TO IDENTIFY', t.unnamed || 0, filed, `${pc(t.unnamed || 0, filed)}%`)))}
    </section>

    ${raw(states.length ? h`<section class="nerd">
      <h2 class="nerd__head">BY STATE</h2>
      ${raw(states.slice(0, 15).map((e) => String(bar(e[0], e[1], states[0][1]))).join(''))}
      ${raw(missing.length ? h`<p class="nerd__note">STILL MISSING: ${missing.join(' · ')}</p>`
        : raw('<p class="nerd__note">ALL FIFTY STATES ACCOUNTED FOR.</p>'))}
    </section>` : '')}

    ${raw(String(table('BIGGEST ORIGINS', towns.results || [], (towns.results || [])[0] ? towns.results[0].n : 1)))}
    ${raw(String(table('FIRST SHOW', (years.results || []).map((r) => ({ k: String(r.k), n: r.n })),
      Math.max(1, ...(years.results || []).map((r) => r.n)))))}
    ${raw(String(table('SHOWS ATTENDED', (attempts.results || []).map((r) => ({ k: String(r.k), n: r.n })),
      Math.max(1, ...(attempts.results || []).map((r) => r.n)))))}

    <p class="fh__links" style="margin-top:1.5rem">
      <a href="/lines">LINES ON FILE</a>
      <a href="/from-here">FR&Oslash;M HERE</a>
      <a href="/incident">THE REGISTER</a>
    </p>
  </main>`;

  return htmlResponse(layout({
    title: 'STATS FOR NERDS — DEMA ARCHIVES',
    body, bodyClass: 'page-stats',
  }), { headers: { 'cache-control': 'public, max-age=120' } });
}
