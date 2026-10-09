import { normalizeId } from './_lib/record.js';
import { banditoName } from './_lib/lore.js';

// names for the designations a browser says it is holding, so the page can
// list them as something other than four characters. everything here is
// already on the public record page -- this just saves fetching three of them
export async function onRequestGet({ request, env }) {
  const asked = String(new URL(request.url).searchParams.get('ids') || '')
    .split(',')
    .map(normalizeId)
    .filter(Boolean)
    .slice(0, 8);

  if (!asked.length) return json([]);

  const marks = asked.map(() => '?').join(',');
  const { results } = await env.DB
    .prepare(`SELECT id, name, hometown FROM records WHERE id IN (${marks}) AND status = 'ESCAPED'`)
    .bind(...asked).all();

  // back in the order the page asked for them
  const found = new Map((results || []).map((r) => [r.id, r]));
  return json(asked.filter((id) => found.has(id)).map((id) => {
    const r = found.get(id);
    return { id, name: r.name || banditoName(id), hometown: r.hometown || null };
  }));
}

function json(data) {
  return new Response(JSON.stringify(data), {
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}
