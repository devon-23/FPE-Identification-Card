export function onRequestGet({ request, params }) {
  return Response.redirect(
    new URL(`/f/${encodeURIComponent(params.id)}`, request.url).toString(),
    301
  );
}
