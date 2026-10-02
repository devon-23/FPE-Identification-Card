// The register is the front page now.
export function onRequestGet({ request }) {
  return Response.redirect(new URL('/', request.url).toString(), 301);
}
