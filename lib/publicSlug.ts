// lib/publicSlug.ts
//
// Shared rules around the slug that ends up in a public URL — both
// on the main host (quiz.tipote.com/q/<slug>) and on a creator's
// custom domain (test.ethilife.fr/<slug>, no /q/ prefix).
//
// Two concerns live here:
//
//   1. RESERVED words. On a custom domain the slug sits at the root
//      of the URL space, so a slug like "api", "embed" or "robots.txt"
//      would silently shadow real routes and break the creator's
//      site. We refuse them at save time.
//
//   2. Cross-type uniqueness. Quiz "foo" and popquiz "foo" can't both
//      exist for the same user, otherwise the catch-all route at
//      app/[publicSlug] wouldn't know which one to serve. We surface
//      a clear SLUG_TAKEN error before write.
//
// The actual SQL lookups live in lib/publicSlugServer.ts so this file
// stays safe to import from Edge runtime / client code.

/** Slugs that would collide with Next routes, infra hostnames, or
 *  files browsers expect to find at the root. Lowercase, exact match. */
export const RESERVED_PUBLIC_SLUGS: ReadonlySet<string> = new Set([
  // Next / framework
  "_next",
  "api",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
  "manifest.json",
  "manifest.webmanifest",
  // Existing app paths (would shadow them on the main host, or look
  // confusing on a custom domain where /<slug> is the expected shape)
  "q", "p", "pq",
  "embed",
  "dashboard",
  "settings",
  "login", "signup", "logout",
  "auth", "legal",
  "quiz", "quizzes",
  "popquiz", "popquizzes",
  "leads", "stats", "admin",
  // Web-standard "well-known" prefix
  ".well-known",
]);

export function isReservedPublicSlug(slug: string): boolean {
  return RESERVED_PUBLIC_SLUGS.has(slug.toLowerCase());
}
