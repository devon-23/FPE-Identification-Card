// Photos are served through the Worker rather than from a public bucket, so
// the bucket itself stays private and deleting a record truly unpublishes it.
export async function onRequestGet({ params, env }) {
  const name = String(params.file || '');
  if (!/^\d{4}\.jpg$/.test(name)) return new Response('Not found', { status: 404 });

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
