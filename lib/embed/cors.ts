// lib/embed/cors.ts
// Shared CORS helper for the public embed API.
//
// The embed JS is loaded by third-party landing pages (systeme.io,
// Carrd, custom HTML, …) so every /api/embed/* route must answer
// preflight OPTIONS calls and stamp the right Access-Control-* headers
// on the actual response.
//
// We allow ANY origin on purpose: the embed is a public marketing
// surface, the data flowing through it is non-sensitive (a draft quiz
// + the lead's own email), and rate-limiting + email validation gate
// the cost. Locking it to a single origin would forbid agencies from
// embedding it on their clients' pages — which is the point.

const ALLOWED_HEADERS = "content-type, x-tiquiz-source";
const ALLOWED_METHODS = "GET, POST, OPTIONS";

export function corsHeaders(origin: string | null): HeadersInit {
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Methods": ALLOWED_METHODS,
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export function preflight(req: Request): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(req.headers.get("origin")),
  });
}

export function withCors(res: Response, origin: string | null): Response {
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(corsHeaders(origin))) {
    headers.set(k, String(v));
  }
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
}
