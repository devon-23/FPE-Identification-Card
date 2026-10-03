export async function onRequestGet({ params, env }) {
  const name = String(params.file || '');
  // 0042.jpg, X001.jpg or Y001.jpg. the letter forms came later and keep
  // catching this out, so it reads off the same shapes normalizeId knows
  if (!/^(?:\d{4}|[XY]\d{3})\.jpg$/.test(name)) return new Response('Not found', { status: 404 });

  if (!env.PHOTOS) return new Response('Not found', { status: 404 });

  const obj = await env.PHOTOS.get(name);
  if (!obj) return new Response('Not found', { status: 404 });

  return new Response(obj.body, {
    headers: {
      'content-type': 'image/jpeg',
      'cache-control': 'public, max-age=300',
      'x-content-type-options': 'nosniff',
      'content-security-policy': "default-src 'none'; sandbox",
    },
  });
}
