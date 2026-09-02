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
import { resolveProjectIdForInsert } from "@/lib/projects/scopeFilter";
import { lireJetonReprise } from "@/lib/embed/reprise";
import { lireSessionReclamable, marquerSessionReclamee, rattacherQuizAnonyme } from "@/lib/embed/rattacherQuiz";

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

  const projectId = await resolveProjectIdForInsert(args.userId);
  const { data: quiz, error: quizErr } = await supabaseAdmin
    .from("quizzes")
    .insert({
      user_id: args.userId,
      project_id: projectId,
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

  // Le jeton vient d'une URL publique : on le VALIDE (lib/embed/reprise.ts)
  // au lieu de l'envoyer tel quel dans un `.eq()`.
  const sessionToken = lireJetonReprise(body.session_token);
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

  // ── LA SESSION, ET LE TRANSFERT ──
  //
  // Les deux vivent dans `lib/embed/rattacherQuiz.ts`, partagés avec
  // l'inscription (`/api/auth/signup`), qui est devenue le chemin
  // NORMAL depuis le 2 septembre. Deux endroits qui transféreraient
  // chacun de leur côté finiraient par se contredire, et ici la
  // contradiction se compte en quiz perdus.
  //
  // Sans jeton explicite (l'appel du webhook), on retombe sur la
  // dernière session non réclamée de cette adresse.
  let sessionId: string;
  let sessionQuiz: unknown = null;

  if (sessionToken) {
    const lue = await lireSessionReclamable({
      jeton: sessionToken,
      // Règle anti-usurpation : quand la session PORTE une adresse, elle
      // doit être celle de la personne connectée. Quand elle n'en porte
      // pas (l'embed n'en demande plus), c'est la POSSESSION du jeton
      // qui autorise.
      emailAttendu: isWebhook ? null : userEmail,
    });
    if (!lue.ok) {
      const statut = lue.raison === "deja-reclamee" ? 409
        : lue.raison === "pas-la-bonne-adresse" ? 403
        : 404;
      return Response.json({ ok: false, reason: lue.raison }, { status: statut, headers });
    }
    sessionId = lue.session.id;
    sessionQuiz = lue.session.quiz;
  } else {
    const { data: sessions, error: selErr } = await supabaseAdmin
      .from("embed_quiz_sessions")
      .select("id, email, quiz, claimed_by_user_id")
      .is("claimed_by_user_id", null)
      .eq("email", userEmail)
      .order("created_at", { ascending: false })
      .limit(1);
    if (selErr) {
      console.error("[embed/claim] session lookup failed:", selErr);
      return Response.json({ ok: false, reason: "session-introuvable" }, { status: 500, headers });
    }
    const s = sessions?.[0];
    if (!s) {
      return Response.json({ ok: false, reason: "session-introuvable" }, { status: 404, headers });
    }
    sessionId = s.id;
    sessionQuiz = s.quiz;
  }

  const transfert = await rattacherQuizAnonyme({ sessionId, userId });

  let imported: { ok: true; quizId: string } | { ok: false; error: string };
  if (transfert.ok) {
    imported = { ok: true, quizId: transfert.quizId };
  } else if (transfert.raison === "aucun-quiz-anonyme") {
    // Repli historique : la session date d'avant la migration 025 et ne
    // porte que le JSON. On le recopie dans des lignes neuves pour ne
    // pas laisser un brouillon d'avant le pivot en rade.
    if (!sessionQuiz) {
      return Response.json({ ok: false, reason: "aucun-quiz" }, { status: 400, headers });
    }
    imported = await importDraftIntoQuizzes({ userId, draft: sessionQuiz as EmbedQuiz });
    if (imported.ok) await marquerSessionReclamee({ sessionId, userId });
  } else {
    imported = { ok: false, error: transfert.raison };
  }

  if (!imported.ok) {
    return Response.json({ ok: false, reason: imported.error }, { status: 500, headers });
  }

  return Response.json({ ok: true, quiz_id: imported.quizId }, { headers });
}
