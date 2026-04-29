// lib/embed/quizAuth.ts
// Dual-mode auth resolver for /api/quiz/[quizId] and friends.
//
// A request can be authenticated in two ways:
//   1) Connected user (cookie session via Supabase) — the canonical
//      path used by the dashboard. Returns { mode: "user", userId }.
//      The quiz is then accessed through the regular Supabase
//      client so RLS enforces user_id = auth.uid().
//   2) Anonymous embed visitor (sales-page iframe) — the request
//      carries the embed_session_id either as the ?embed= query
//      param or the X-Tiquiz-Embed-Session header. We verify the
//      target quiz is the one this session owns (quizzes.embed_
//      session_id = token AND user_id IS NULL) and then operate
//      via supabaseAdmin (service role).
//
// The two paths are completely orthogonal: an embed token NEVER
// grants access to a claimed quiz, and a user cookie NEVER grants
// access to an anonymous quiz. Possession of one does not weaken
// the other.

import { NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type QuizAuthUser = { mode: "user"; userId: string };
export type QuizAuthEmbed = { mode: "embed"; sessionToken: string };
export type QuizAuthResult = QuizAuthUser | QuizAuthEmbed | null;

const TOKEN_HEADER = "x-tiquiz-embed-session";
const TOKEN_PARAM = "embed";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function readEmbedToken(req: NextRequest): string | null {
  const headerVal = req.headers.get(TOKEN_HEADER);
  if (headerVal && UUID_RE.test(headerVal.trim())) return headerVal.trim();
  const url = new URL(req.url);
  const queryVal = url.searchParams.get(TOKEN_PARAM);
  if (queryVal && UUID_RE.test(queryVal.trim())) return queryVal.trim();
  return null;
}

/**
 * Resolve who can act on this quizId.
 *
 * Returns:
 *   - { mode: "user", userId } when a cookie-authenticated user
 *     owns the quiz
 *   - { mode: "embed", sessionToken } when an anonymous embed visitor
 *     presents the matching session token AND the quiz is still
 *     anonymous (user_id IS NULL)
 *   - null when neither path authorizes
 */
export async function resolveQuizAuth(
  req: NextRequest,
  quizId: string,
): Promise<QuizAuthResult> {
  if (!UUID_RE.test(quizId)) return null;

  // Embed path takes priority ONLY when the token is supplied AND the
  // quiz is still anonymous. We check anonymity first so a stale
  // token (visitor that already claimed) doesn't accidentally grant
  // edit rights on a now-owned quiz.
  const token = readEmbedToken(req);
  if (token) {
    const { data: row } = await supabaseAdmin
      .from("quizzes")
      .select("id, embed_session_id, user_id")
      .eq("id", quizId)
      .maybeSingle();
    if (row && row.user_id === null && row.embed_session_id === token) {
      return { mode: "embed", sessionToken: token };
    }
    // Token presented but doesn't match: fall through to user auth
    // (the visitor may have just signed up and the cookie is now
    // authoritative). Never return 401 just because of a stale token.
  }

  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user?.id) return { mode: "user", userId: user.id };
  return null;
}
