// app/api/embed/quiz/claim/route.ts
// Convert an anonymous embed draft into a real Tiquiz quiz once the
// visitor has paid + signed up.
//
// Two callers, same endpoint:
//   1) The systeme.io order webhook: server-to-server, authenticated
//      by SYSTEME_IO_WEBHOOK_SECRET in the X-Tiquiz-Webhook-Secret
//      header. Body: { email, session_token? } — if no token, we pick
//      the most recent un-claimed session for that email.
//   2) The newly-signed-up user from the dashboard "Reprendre mon
//      quiz" CTA: regular Supabase cookie auth, body { session_token }.
//      We verify the email on the session matches the user's email
//      so a paid user can't claim someone else's draft.

import { NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { corsHeaders, preflight } from "@/lib/embed/cors";

export const runtime = "nodejs";

export async function OPTIONS(req: NextRequest) {
  return preflight(req);
}

type EmbedQuiz = {
  title?: string;
  introduction?: string;
  description?: string;
  questions?: Array<Record<string, unknown>>;
  results?: Array<Record<string, unknown>>;
  cta_text?: string;
  cta_url?: string;
  share_message?: string;
  locale?: string;
  [k: string]: unknown;
};

// Mirrors the shape used by /api/quiz/route.ts (POST). Keep it byte-for
// -byte compatible — the dashboard editor reads back from the same
// tables, so any field we drop here disappears from the user's view.
async function importDraftIntoQuizzes(args: {
  userId: string;
  draft: EmbedQuiz;
}): Promise<{ ok: true; quizId: string } | { ok: false; error: string }> {
  const draft = args.draft;
  const title = String(draft?.title ?? "Mon quiz").slice(0, 200);
  const introduction = String(
    draft?.introduction ?? draft?.description ?? "",
  ).slice(0, 2000) || null;

  // Brand overrides from the embed editor's Branding tab. Only kept
  // when valid so a malformed payload can't poison the quiz row;
  // unset values fall back to the user's profile defaults at render.
  const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
  const draftRecord = draft as Record<string, unknown>;
  const brandFontRaw = typeof draftRecord.brand_font === "string" ? draftRecord.brand_font : "";
  const brandPrimaryRaw = typeof draftRecord.brand_color_primary === "string" ? draftRecord.brand_color_primary : "";
  const brandBgRaw = typeof draftRecord.brand_color_background === "string" ? draftRecord.brand_color_background : "";

  const { data: quiz, error: quizErr } = await supabaseAdmin
    .from("quizzes")
    .insert({
      user_id: args.userId,
      mode: "quiz",
      title,
      introduction,
      cta_text: draftRecord.cta_text ?? null,
      cta_url: draftRecord.cta_url ?? null,
      share_message: draftRecord.share_message ?? null,
      locale: draft?.locale ?? "fr",
      address_form: "tu",
      status: "draft",
      brand_font: brandFontRaw || null,
      brand_color_primary: HEX_RE.test(brandPrimaryRaw) ? brandPrimaryRaw : null,
      brand_color_background: HEX_RE.test(brandBgRaw) ? brandBgRaw : null,
    })
    .select("id")
    .single();

  if (quizErr || !quiz) {
    console.error("[embed/claim] quiz insert failed:", quizErr);
    return { ok: false, error: "Création du quiz impossible" };
  }

  const questions = Array.isArray(draft.questions) ? draft.questions : [];
  if (questions.length > 0) {
    await supabaseAdmin.from("quiz_questions").insert(
      questions.map((q, i) => ({
        quiz_id: quiz.id,
        // The embed JSON uses `text` (matches Claude's prompt); the
        // canonical column is question_text. Accept both for safety.
        question_text: String(q.question_text ?? q.text ?? ""),
        options: Array.isArray(q.options) ? q.options : [],
        sort_order: i,
        question_type: "multiple_choice",
        config: {},
      })),
    );
  }

  const results = Array.isArray(draft.results) ? draft.results : [];
  if (results.length > 0) {
    await supabaseAdmin.from("quiz_results").insert(
      results.map((r, i) => ({
        quiz_id: quiz.id,
        title: String(r.title ?? ""),
        description: r.description ?? null,
        insight: r.insight ?? null,
        projection: r.projection ?? null,
        cta_text: r.cta_text ?? null,
        cta_url: r.cta_url ?? null,
        sort_order: i,
      })),
    );
  }

  return { ok: true, quizId: quiz.id };
}

export async function POST(req: NextRequest) {
  const headers = corsHeaders(req.headers.get("origin"));

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400, headers });
  }

  const sessionToken = String(body.session_token ?? "").trim() || null;
  const webhookSecret = req.headers.get("x-tiquiz-webhook-secret");
  const expectedSecret = process.env.SYSTEME_IO_WEBHOOK_SECRET ?? "";
  const isWebhook = Boolean(expectedSecret) && webhookSecret === expectedSecret;

  // Resolve the target user.
  let userId: string;
  let userEmail: string;

  if (isWebhook) {
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!email) {
      return Response.json({ ok: false, error: "email requis" }, { status: 400, headers });
    }
    // The systeme.io webhook fires AFTER signup so the auth user must
    // already exist. We look it up by email via the admin API.
    const { data: list, error: lookupErr } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (lookupErr) {
      console.error("[embed/claim] auth lookup failed:", lookupErr);
      return Response.json({ ok: false, error: "Lookup impossible" }, { status: 500, headers });
    }
    const match = list?.users?.find((u) => u.email?.toLowerCase() === email);
    if (!match) {
      // Not an error: the webhook may arrive before the signup
      // hook completes. Caller is expected to retry.
      return Response.json({ ok: false, error: "Utilisateur non trouvé (réessaie après signup)" }, { status: 404, headers });
    }
    userId = match.id;
    userEmail = email;
  } else {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ ok: false, error: "Non authentifié" }, { status: 401, headers });
    }
    userId = user.id;
    userEmail = (user.email ?? "").toLowerCase();
  }

  // Pick the session: explicit token wins, otherwise latest un-claimed
  // for this email.
  const query = supabaseAdmin
    .from("embed_quiz_sessions")
    .select("id, email, quiz, claimed_by_user_id")
    .is("claimed_by_user_id", null)
    .order("created_at", { ascending: false })
    .limit(1);

  const { data: sessions, error: selErr } = sessionToken
    ? await supabaseAdmin
        .from("embed_quiz_sessions")
        .select("id, email, quiz, claimed_by_user_id")
        .eq("id", sessionToken)
        .limit(1)
    : await query.eq("email", userEmail);

  if (selErr) {
    console.error("[embed/claim] session lookup failed:", selErr);
    return Response.json({ ok: false, error: "Session introuvable" }, { status: 500, headers });
  }
  const session = sessions?.[0];
  if (!session) {
    return Response.json({ ok: false, error: "Aucune session à réclamer" }, { status: 404, headers });
  }
  if (session.claimed_by_user_id) {
    return Response.json({ ok: false, error: "Session déjà réclamée" }, { status: 409, headers });
  }
  if (!session.quiz) {
    return Response.json({ ok: false, error: "Cette session n'a pas encore de quiz généré" }, { status: 400, headers });
  }
  // Anti email-spoofing rule: when the session HAS an email we require
  // it to match the logged-in user's. When the session has NO email
  // (the embed no longer asks for it), we trust possession of the
  // opaque session_token as the authorization signal — the token is
  // a UUID stored in the visitor's localStorage / passed through the
  // checkout URL, never exposed to third parties.
  if (!isWebhook && session.email && session.email.toLowerCase() !== userEmail) {
    return Response.json({ ok: false, error: "Cette session n'appartient pas à cet email" }, { status: 403, headers });
  }

  // Modern path: the /generate route already materialized a real
  // anonymous quiz row (quizzes.embed_session_id = sessionToken,
  // user_id NULL). We just transfer ownership atomically — no
  // duplication, the URL the visitor was editing in /quiz/[id]
  // becomes their permanent quiz id.
  const { data: anonQuiz } = await supabaseAdmin
    .from("quizzes")
    .select("id")
    .eq("embed_session_id", session.id)
    .is("user_id", null)
    .maybeSingle();

  let imported: { ok: true; quizId: string } | { ok: false; error: string };

  if (anonQuiz?.id) {
    const { error: transferErr } = await supabaseAdmin
      .from("quizzes")
      .update({ user_id: userId, embed_session_id: null })
      .eq("id", anonQuiz.id)
      .is("user_id", null);
    if (transferErr) {
      console.error("[embed/claim] ownership transfer failed:", transferErr);
      imported = { ok: false, error: "Transfert d'ownership impossible" };
    } else {
      imported = { ok: true, quizId: anonQuiz.id };
    }
  } else {
    // Legacy fallback: the session was generated before migration 025
    // and only has the JSON blob. Duplicate it into fresh rows so
    // pre-pivot drafts aren't stranded.
    imported = await importDraftIntoQuizzes({
      userId,
      draft: session.quiz as EmbedQuiz,
    });
  }
  if (!imported.ok) {
    return Response.json({ ok: false, error: imported.error }, { status: 500, headers });
  }

  await supabaseAdmin
    .from("embed_quiz_sessions")
    .update({ claimed_by_user_id: userId, claimed_at: new Date().toISOString() })
    .eq("id", session.id);

  return Response.json({ ok: true, quiz_id: imported.quizId }, { headers });
}
