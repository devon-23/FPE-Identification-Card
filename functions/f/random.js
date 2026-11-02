// sends you to somebody at random.
//
// this used to be ORDER BY RANDOM(), which sounds harmless and is not: it
// reads every row in the table to shuffle them, so one click cost ~7,600
// row reads. crawlers found it, it redirects somewhere new every time so
// they kept following it, and it ate a day's D1 quota on its own.
//
// MAX on an indexed column is a single index seek, and so is the >= lookup.
//
// INDEXED BY is not decoration: status='ESCAPED' matches 7,588 of 7,668
// rows, so the planner happily picks the status index and sorts the lot,
// and the n range gets ignored. measured it -- without the hint this was
// still reading the whole table.
export async function onRequestGet({ env }) {
  // `n` is mostly empty space: the hundred cards sit at 1-100 and the
  // provisional blocks start at 100001, 200001 and 300001. a uniform draw
  // across the whole range lands in a gap 97% of the time, and every pick
  // in a gap seeks forward to the same next record -- the first version of
  // this returned one of about four subjects over and over.
  //
  // so draw inside a block that actually has rows in it. the X block holds
  // the overwhelming majority of the register; the cards get a slice of the
  // draw so the hundred turn up too.
  const edge = await env.DB.prepare(`
    SELECT MAX(CASE WHEN n BETWEEN 100001 AND 199999 THEN n END) AS x,
           MAX(CASE WHEN n <= 100 THEN n END) AS c
      FROM records
  `).first();

  const topX = (edge && edge.x) || 0;
  const topC = (edge && edge.c) || 0;

  const picks = [];
  if (topX > 100000) picks.push(100001 + Math.floor(Math.random() * (topX - 100000)));
  if (topC > 0) picks.push(1 + Math.floor(Math.random() * topC));
  picks.push(1);                              // last resort, first row in the table

  // one in twelve goes to the hundred, if there are any
  if (picks.length === 3 && Math.random() > 1 / 12) picks.splice(1, 1);

  let id = null;
  for (const from of picks) {
    const row = await env.DB.prepare(`
      SELECT id FROM records INDEXED BY records_n_idx
       WHERE n >= ? AND status = 'ESCAPED' AND attending = 1
       ORDER BY n LIMIT 1
    `).bind(from).first();
    if (row && row.id) { id = row.id; break; }
  }

  return new Response(null, {
    status: 302,
    headers: {
      location: id ? `/f/${id}` : '/incident',
      'cache-control': 'no-store',
      // nothing to index, and following it forever is what caused the bill
      'x-robots-tag': 'noindex, nofollow',
    },
  });
}
