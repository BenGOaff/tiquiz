// app/api/embed/quiz/[sessionToken]/route.ts
// Public GET — return the draft quiz for a given embed session token.
//
// The iframe-based preview page uses this on first load to hydrate
// when the visitor opens a saved-for-later session. Token possession
// is the only auth signal; the token is a UUID that lives in the
// visitor's localStorage and is never exposed to third parties.

import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { corsHeaders, preflight } from "@/lib/embed/cors";

export const runtime = "nodejs";

export async function OPTIONS(req: NextRequest) {
  return preflight(req);
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ sessionToken: string }> },
) {
  const headers = corsHeaders(req.headers.get("origin"));
  const { sessionToken } = await ctx.params;

  if (!sessionToken) {
    return Response.json({ ok: false, error: "session_token requis" }, { status: 400, headers });
  }

  const { data, error } = await supabaseAdmin
    .from("embed_quiz_sessions")
    .select("id, inputs, quiz, claimed_by_user_id, saved_for_later, created_at")
    .eq("id", sessionToken)
    .maybeSingle();

  if (error) {
    console.error("[embed/[token]] lookup failed:", error);
    return Response.json({ ok: false, error: "Lookup impossible" }, { status: 500, headers });
  }
  if (!data) {
    return Response.json({ ok: false, error: "Session inconnue" }, { status: 404, headers });
  }

  return Response.json({
    ok: true,
    session_token: data.id,
    inputs: data.inputs ?? {},
    quiz: data.quiz ?? null,
    claimed: !!data.claimed_by_user_id,
    saved_for_later: !!data.saved_for_later,
  }, { headers });
}
