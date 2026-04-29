// app/api/embed/quiz/save/route.ts
// Persist the visitor's edits on their embed quiz draft.
//
// The embed only ever holds the session_token returned by /generate.
// We trust whoever owns that token to overwrite the draft — there's
// no real user account yet, and the worst case is "the visitor edits
// their own quiz from the same browser". Once /claim links the row
// to a real Tiquiz account, this endpoint stops accepting writes.

import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { corsHeaders, preflight } from "@/lib/embed/cors";

export const runtime = "nodejs";

export async function OPTIONS(req: NextRequest) {
  return preflight(req);
}

export async function POST(req: NextRequest) {
  const headers = corsHeaders(req.headers.get("origin"));

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400, headers });
  }

  const sessionToken = String(body.session_token ?? "").trim();
  const quiz = body.quiz;
  const savedForLater = Boolean(body.saved_for_later);
  // Optional email payload — set when the visitor reaches the
  // publish step. We accept it once and never overwrite it (a row's
  // email is the canonical lead identity for the claim flow).
  const rawEmail = String(body.email ?? "").trim().toLowerCase();
  const email = rawEmail && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(rawEmail)
    ? rawEmail
    : null;

  if (!sessionToken) {
    return Response.json({ ok: false, error: "session_token requis" }, { status: 400, headers });
  }
  if (!quiz || typeof quiz !== "object") {
    return Response.json({ ok: false, error: "quiz invalide" }, { status: 400, headers });
  }

  // Defensive size cap: 200 KB of JSON is already 10x what a normal
  // 5-question quiz weighs. Anything bigger smells like abuse.
  const serialized = JSON.stringify(quiz);
  if (serialized.length > 200_000) {
    return Response.json({ ok: false, error: "Quiz trop volumineux" }, { status: 413, headers });
  }

  const { data: row } = await supabaseAdmin
    .from("embed_quiz_sessions")
    .select("id, email, claimed_by_user_id")
    .eq("id", sessionToken)
    .maybeSingle();

  if (!row) {
    return Response.json({ ok: false, error: "Session inconnue" }, { status: 404, headers });
  }
  if (row.claimed_by_user_id) {
    // After checkout the canonical copy lives in the `quizzes` table.
    // Updating the embed draft here would silently desynchronize the
    // creator's real quiz, so we refuse.
    return Response.json(
      { ok: false, error: "Quiz déjà importé dans ton compte." },
      { status: 409, headers },
    );
  }

  const patch: Record<string, unknown> = { quiz, saved_for_later: savedForLater };
  // Only write the email if (a) we have a valid one and (b) the row
  // doesn't already have one — locks the lead identity in place.
  if (email && !row.email) patch.email = email;

  const { error: updateErr } = await supabaseAdmin
    .from("embed_quiz_sessions")
    .update(patch)
    .eq("id", sessionToken);

  if (updateErr) {
    console.error("[embed/save] update failed:", updateErr);
    return Response.json({ ok: false, error: "Sauvegarde impossible" }, { status: 500, headers });
  }

  return Response.json({ ok: true }, { headers });
}
