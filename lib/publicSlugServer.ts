// lib/publicSlugServer.ts
//
// Server-only: looks up whether a slug is already taken by content of
// a different type for the same user. Quiz and popquiz share the
// custom-domain URL space (test.ethilife.fr/<slug>), so a collision
// would make the catch-all route ambiguous.
//
// Kept separate from lib/publicSlug.ts because supabaseAdmin pulls in
// the service-role client (Node runtime only) — Edge middleware
// imports the constants from publicSlug.ts but never the lookup.

import { supabaseAdmin } from "./supabaseAdmin";

/**
 * Checks whether a popquiz of the same user already owns `slug`.
 * Returns true when the slug is taken by the OTHER type — caller
 * should refuse the save.
 *
 * `excludeId` is for the edit case: when renaming a quiz, we want to
 * ignore the row that already holds the slug under its own id (no
 * concept here since we look in the popquiz table — left in for
 * symmetry with the SQL pattern in the existing quiz route).
 */
export async function isSlugTakenByPopquiz(
  userId: string,
  slug: string,
): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("popquizzes")
    .select("id")
    .eq("user_id", userId)
    .ilike("slug", slug)
    .limit(1)
    .maybeSingle();
  return !!data;
}

/** Mirror of the above for the popquiz save route. */
export async function isSlugTakenByQuiz(
  userId: string,
  slug: string,
): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("quizzes")
    .select("id")
    .eq("user_id", userId)
    .ilike("slug", slug)
    .limit(1)
    .maybeSingle();
  return !!data;
}
