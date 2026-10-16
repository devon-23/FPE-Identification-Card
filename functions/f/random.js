// sends you to somebody. the whole point of the register is that it is full
// of strangers, and nothing on the site was inviting anybody to meet one.
//
// ORDER BY RANDOM() reads the lot, so this only ever looks at the ids of
// subjects who are actually on the register -- one column, no joins
export async function onRequestGet({ env }) {
  const row = await env.DB.prepare(`
    SELECT id FROM records
     WHERE status = 'ESCAPED' AND attending = 1
     ORDER BY RANDOM() LIMIT 1
  `).first();

  return new Response(null, {
    status: 302,
    headers: {
      location: row && row.id ? `/f/${row.id}` : '/incident',
      'cache-control': 'no-store',
    },
  });
}
