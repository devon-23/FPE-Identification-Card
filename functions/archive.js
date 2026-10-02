export function onRequestGet({ request }) {
  return Response.redirect(new URL('/', request.url).toString(), 301);
}
