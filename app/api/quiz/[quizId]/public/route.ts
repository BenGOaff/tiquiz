// app/api/quiz/[quizId]/public/route.ts
// Public endpoints for quiz visitors (no auth required).
// GET: fetch active quiz data
// POST: submit lead (email capture) + auto-send to Systeme.io with result tag
// PATCH: mark share + auto-apply share tag in Systeme.io
//
// SIO KEY RESOLUTION
// ------------------
// The API key used to sync each lead is resolved through the cascade in
// lib/sio/resolveApiKey.ts: explicit quiz.sio_api_key_id → user default →
// any user key → legacy plaintext column. This guarantees that when a
// funnel-builder manages multiple Systeme.io workspaces (one per client),
// every lead lands in the workspace attached to its quiz — never another.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { assetProxyEnabled, proxyAssetsDeep } from "@/lib/assetProxy";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { resolveQuizBranding } from "@/lib/quizBranding";
import { resolveApiKey } from "@/lib/sio/resolveApiKey";
import { isNewLeadLocked } from "@/lib/leadLock";
import { isPaidPlan } from "@/lib/planLimits";
import { applyFrenchTypography, isFrenchLocale } from "@/lib/frenchTypography";
import { sendCapiLead } from "@/lib/metaCapi";
import { logBusinessEvent, dedupeKeys } from "@/lib/businessEvents";
import { mergeOwnerBranding } from "@/lib/projects/businessProfile";
import { notifyCreatorOfResponse } from "@/lib/email/responseNotification";
import { buildQuestionPositions, resolveQuestionPosition } from "@/lib/quiz/questionIdentity";
import {
  sanitizeScoresSnapshot,
  resolveScoreLabels,
  scorePercent,
  scoreTranche,
  normalizeScoringAxes,
  axisSlug,
  slugifyAxisLabel,
} from "@/lib/quizScoring";
import { affiliateAbsent, lireAffiliateObjet } from "@/lib/quiz/affiliateRelay";
import { echapperMotifLike } from "@/lib/db/motifLike";
// LES TROIS AIDES ONT DEMENAGE dans le module de charge, et on les
// RE-IMPORTE plutot que d'en garder une copie : deux versions de
// `resolveQuizId` finiraient par ne plus resoudre le meme quiz, et le
// POST (la capture du lead) ecrirait alors sur une autre ligne que
// celle que le visiteur a lue.
import {
  chargerQuizPublic,
  hostnameLabel,
  resolveQuizId,
  UUID_RE,
} from "@/lib/quiz/chargerQuizPublic";

// No `force-dynamic`: it would make Vercel inject `Cache-Control: private, no-store`,
// overriding the edge-SWR headers set on the GET response and forcing `cf-cache-status: DYNAMIC`.
export const maxDuration = 30;

type RouteContext = { params: Promise<{ quizId: string }> };

const SIO_BASE = "https://api.systeme.io/api";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


async function sioFetch(
  apiKey: string,
  path: string,
  opts: { method?: string; body?: unknown } = {},
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const method = opts.method ?? "GET";
  const headers: Record<string, string> = {
    "X-API-Key": apiKey,
    Accept: "application/json",
  };
  let payload: string | undefined;
  if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(opts.body);
  }
  const res = await fetch(`${SIO_BASE}${path}`, { method, headers, body: payload });
  const text = await res.text();
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { ok: res.ok, status: res.status, data };
}

async function ensureSioTag(apiKey: string, tagName: string): Promise<number | null> {
  const search = await sioFetch(apiKey, `/tags?query=${encodeURIComponent(tagName)}&limit=100`);
  if (search.ok && Array.isArray((search.data as Record<string, unknown>)?.items)) {
    const items = (search.data as Record<string, unknown[]>).items as Record<string, unknown>[];
    const match = items.find((t) => String(t.name).toLowerCase() === tagName.toLowerCase());
    if (match?.id) return Number(match.id);
  }
  const create = await sioFetch(apiKey, "/tags", { method: "POST", body: { name: tagName } });
  if (create.ok && (create.data as Record<string, unknown>)?.id) return Number((create.data as Record<string, unknown>).id);
  if (create.status === 422) {
    const retry = await sioFetch(apiKey, `/tags?query=${encodeURIComponent(tagName)}&limit=100`);
    if (retry.ok && Array.isArray((retry.data as Record<string, unknown>)?.items)) {
      const items = (retry.data as Record<string, unknown[]>).items as Record<string, unknown>[];
      const match = items.find((t) => String(t.name).toLowerCase() === tagName.toLowerCase());
      if (match?.id) return Number(match.id);
    }
  }
  return null;
}

// Label lisible d'une URL (hostname sans www) — sert de texte de footer
// par défaut quand seule l'URL du branding est fournie.

function buildSioFields(
  fields: { firstName?: string; surname?: string; phoneNumber?: string; country?: string } | undefined,
  includeCountry: boolean,
): { slug: string; value: string }[] {
  if (!fields) return [];
  const out: { slug: string; value: string }[] = [];
  if (fields.firstName) out.push({ slug: "first_name", value: fields.firstName });
  if (fields.surname) out.push({ slug: "surname", value: fields.surname });
  if (fields.phoneNumber) out.push({ slug: "phone_number", value: fields.phoneNumber });
  if (includeCountry && fields.country) out.push({ slug: "country", value: fields.country });
  return out;
}

async function ensureSioContact(
  apiKey: string,
  email: string,
  fields?: { firstName?: string; surname?: string; phoneNumber?: string; country?: string },
): Promise<number | null> {
  const search = await sioFetch(apiKey, `/contacts?email=${encodeURIComponent(email)}&limit=10`);
  if (search.ok && Array.isArray((search.data as Record<string, unknown>)?.items)) {
    const items = (search.data as Record<string, unknown[]>).items as Record<string, unknown>[];
    if (items.length > 0) {
      const existingId = Number(items[0].id);
      if (fields && Object.values(fields).some(Boolean)) {
        const patchFields = buildSioFields(fields, true);
        if (patchFields.length > 0) {
          const patchRes = await sioFetch(apiKey, `/contacts/${existingId}`, { method: "PATCH", body: { fields: patchFields } });
          if (!patchRes.ok && fields.country) {
            const fallback = buildSioFields(fields, false);
            if (fallback.length > 0) await sioFetch(apiKey, `/contacts/${existingId}`, { method: "PATCH", body: { fields: fallback } });
          }
        }
      }
      return existingId;
    }
  }

  const contactBody: Record<string, unknown> = { email, locale: "fr" };
  const sioFields = buildSioFields(fields, true);
  if (sioFields.length > 0) contactBody.fields = sioFields;
  const create = await sioFetch(apiKey, "/contacts", { method: "POST", body: contactBody });
  if (create.ok && (create.data as Record<string, unknown>)?.id) return Number((create.data as Record<string, unknown>).id);

  if (create.status === 422) {
    const retrySearch = await sioFetch(apiKey, `/contacts?email=${encodeURIComponent(email)}&limit=10`);
    if (retrySearch.ok && Array.isArray((retrySearch.data as Record<string, unknown>)?.items)) {
      const items = (retrySearch.data as Record<string, unknown[]>).items as Record<string, unknown>[];
      if (items.length > 0) return Number(items[0].id);
    }
    if (fields?.country) {
      const fallbackBody: Record<string, unknown> = { email, locale: "fr" };
      const fallbackFields = buildSioFields(fields, false);
      if (fallbackFields.length > 0) fallbackBody.fields = fallbackFields;
      const retryCreate = await sioFetch(apiKey, "/contacts", { method: "POST", body: fallbackBody });
      if (retryCreate.ok && (retryCreate.data as Record<string, unknown>)?.id) return Number((retryCreate.data as Record<string, unknown>).id);
    }
  }
  return null;
}

async function applyTagToContact(
  apiKey: string,
  email: string,
  tagName: string,
  fields?: { firstName?: string; surname?: string; phoneNumber?: string; country?: string },
): Promise<number | null> {
  try {
    const tagId = await ensureSioTag(apiKey, tagName);
    if (!tagId) return null;
    const contactId = await ensureSioContact(apiKey, email, fields);
    if (!contactId) return null;
    await sioFetch(apiKey, `/contacts/${contactId}/tags`, { method: "POST", body: { tagId } });
    return contactId;
  } catch (e) {
    console.error("[Systeme.io auto-tag] Error:", e);
    return null;
  }
}

async function enrichSioContact(apiKey: string, contactId: number, quizResultTitle: string) {
  try {
    await sioFetch(apiKey, `/contacts/${contactId}`, {
      method: "PATCH",
      body: { fields: [{ slug: "tiquiz_result", value: quizResultTitle }] },
    });
  } catch (e) {
    console.error("[Systeme.io enrich] Error:", e);
  }
}

async function enrollInSioCourse(apiKey: string, courseId: string, contactId: number) {
  try {
    await sioFetch(apiKey, `/school/courses/${courseId}/enrollments`, { method: "POST", body: { contactId } });
  } catch (e) {
    console.error("[Systeme.io course enrollment] Error:", e);
  }
}

async function addToSioCommunity(apiKey: string, communityId: string, contactId: number) {
  try {
    await sioFetch(apiKey, `/community/communities/${communityId}/memberships`, { method: "POST", body: { contactId } });
  } catch (e) {
    console.error("[Systeme.io community add] Error:", e);
  }
}

// ── GET — public quiz data ───────────────────────────────────────

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { quizId: slugOrId } = await context.params;

    // LA CHARGE EST CALCULEE PAR `chargerQuizPublic`, ET PAR ELLE SEULE.
    // La page publique (`app/q/[quizId]/page.tsx`) appelle la MEME
    // fonction pour livrer la reponse AVEC le HTML : deux calculs
    // separes finiraient par ne plus dire la meme chose, et la
    // divergence couterait le branding ou les pixels d'une creatrice
    // selon la porte par laquelle son quiz a ete charge.
    const jetonEmbed = req.nextUrl.searchParams.get("embed");

    // L'aperçu du createur sur son propre brouillon : on relit sa
    // session ICI, parce que seule la route a les cookies sous la main.
    let utilisateurConnecte: string | null = null;
    try {
      const supabase = await getSupabaseServerClient();
      const { data: { user } } = await supabase.auth.getUser();
      utilisateurConnecte = user?.id ?? null;
    } catch {
      // anonyme, c'est le cas normal
    }

    const charge = await chargerQuizPublic({ slugOrId, jetonEmbed, utilisateurConnecte });
    if (!charge.ok) {
      return NextResponse.json({ ok: false, error: charge.erreur }, { status: charge.statut });
    }

    // Edge-SWR resilience pour les visiteurs : si l'origine est down
    // (deploy / crash / DB hiccup) on continue à servir la dernière
    // bonne réponse. On garde 60s de fresh + 60s de stale-while-
    // revalidate (au lieu de 86400/24h précédent) — sinon, quand le
    // créateur édite ses couleurs / titre, un visiteur ayant déjà
    // ouvert l'URL voyait l'ancienne version pendant 24h alors qu'un
    // hard refresh aurait suffi. Bug remonté par Adeline (16 mai 2026,
    // "sur mon tel la couleur du quiz n'est pas la bonne").
    //
    // MESURE DU 9 SEPTEMBRE : Cloudflare repond `DYNAMIC` sur trois
    // appels de suite, et il a RAISON — cette reponse porte un
    // `set-cookie` (`ui_locale`, et `tq_ref` sur un lien affilie). Un
    // cache partage servirait donc le cookie d'une affiliee a tous les
    // visiteurs suivants : c'est la regle `pages` que Bene a supprimee
    // le 7 septembre. Ces en-tetes ne servent qu'un cache PRIVE (le
    // navigateur), et il ne faut poser AUCUNE Cache Rule dessus.
    const cacheHeaders: Record<string, string> = charge.prive
      ? {
          "Cache-Control": "private, no-store, max-age=0",
          "CDN-Cache-Control": "no-store",
          "Vercel-CDN-Cache-Control": "no-store",
        }
      : {
          "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=60",
          "CDN-Cache-Control": "public, s-maxage=60, stale-while-revalidate=60",
          "Vercel-CDN-Cache-Control": "public, s-maxage=60, stale-while-revalidate=60",
        };

    return NextResponse.json(
      {
        ok: true,
        // Flag remonté quand le quiz est servi en mode aperçu (créateur
        // sur un quiz draft) — le client affiche un toast pour informer
        // qu'il faut publier pour partager. Bug Fabienne 2026-05-09.
        isDraftPreview: charge.isDraftPreview,
        quiz: charge.quiz,
        questions: charge.questions,
        results: charge.results,
        branding: charge.branding,
      },
      { headers: cacheHeaders },
    );
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}

// ── POST — submit lead + auto-tag in Systeme.io ────────────────

/**
 * L'erreur PostgREST "cette colonne n'existe pas".
 *
 * `42703` est le code Postgres pour un nom de colonne inconnu ; le
 * message est lu en secours parce que PostgREST ne le remonte pas
 * toujours de la même façon selon la version.
 */
function colonneInconnue(err: { code?: string | null; message?: string | null } | null): boolean {
  if (!err) return false;
  if (String(err.code ?? "") === "42703" || String(err.code ?? "") === "PGRST204") return true;
  const m = String(err.message ?? "").toLowerCase();
  return m.includes("column") && (m.includes("does not exist") || m.includes("schema cache"));
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { quizId: slugOrId } = await context.params;
    const admin = supabaseAdmin;

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
    }

    const rawEmail = String(body.email ?? "").trim().toLowerCase();
    const isAnonymousSubmit = body.anonymous === true;

    // Sondage anonyme : capture désactivée par l'auteur. Le visiteur
    // envoie quand même ses réponses pour alimenter l'agrégation, mais
    // sans email valide. On synthétise un email unique pour respecter
    // la contrainte NOT NULL + UNIQUE(quiz_id,email). Pas de sync SIO,
    // pas de Lead pixel — l'anonyme ne génère aucune piste commerciale.
    let email = rawEmail;
    if (!isAnonymousSubmit && !EMAIL_RE.test(email)) {
      return NextResponse.json({ ok: false, error: "Valid email required" }, { status: 400 });
    }

    const quizId = await resolveQuizId(admin, slugOrId, { requireActive: true });
    if (!quizId) {
      return NextResponse.json({ ok: false, error: "Quiz not found or inactive" }, { status: 404 });
    }

    // Pull sio_api_key_id alongside user_id so the right SIO workspace
    // gets the lead. Reading both in one query avoids any race where the
    // editor changes the attached key between SELECT and sync. On lit
    // aussi capture_enabled pour valider la branche anonyme.
    const { data: quiz } = await admin
      .from("quizzes")
      .select("id, user_id, title, sio_api_key_id, meta_pixel_id, mode, capture_enabled, project_id, sio_capture_tag, sio_score_tags, scoring_axes, score_labels, locale")
      .eq("id", quizId)
      .maybeSingle();

    if (!quiz) {
      return NextResponse.json({ ok: false, error: "Quiz not found or inactive" }, { status: 404 });
    }

    // Validation de la branche anonyme : seulement pour les sondages
    // dont l'auteur a explicitement décoché la capture. Sinon on rejette
    // pour empêcher un bot de polluer la table avec des leads sans email.
    if (isAnonymousSubmit) {
      const isSurvey = (quiz as { mode?: string | null }).mode === "survey";
      const captureOff = (quiz as { capture_enabled?: boolean | null }).capture_enabled === false;
      if (!isSurvey || !captureOff) {
        return NextResponse.json({ ok: false, error: "Anonymous submit not allowed for this quiz" }, { status: 403 });
      }
      // Email synthétique : pas une vraie adresse, unique par soumission.
      // anon-<timestamp>-<random>@anon.tiquiz pour rester reconnaissable
      // dans la table sans pouvoir être confondu avec une vraie adresse.
      const rand = Math.random().toString(36).slice(2, 10);
      email = `anon-${Date.now().toString(36)}-${rand}@anon.tiquiz`;
    }

    try {
      const { data: limitResult } = await admin.rpc("increment_response_count", { p_user_id: quiz.user_id });
      if (limitResult && typeof limitResult === "object" && (limitResult as Record<string, unknown>).allowed === false) {
        console.warn(`[Tiquiz] Quiz owner ${quiz.user_id} hit response limit`);
      }
    } catch {
      // fail-open: never block quiz visitors
    }

    const resultId = (body.result_id as string) ?? null;
    const firstName = String(body.first_name ?? "").trim().slice(0, 100);
    const lastName = String(body.last_name ?? "").trim().slice(0, 100);
    const phone = String(body.phone ?? "").trim().slice(0, 30);
    const country = String(body.country ?? "").trim().slice(0, 50);
    const rawGender = String(body.gender ?? "").trim().toLowerCase();
    const gender: "m" | "f" | "x" | null = rawGender === "m" || rawGender === "f" || rawGender === "x" ? rawGender : null;
    const answers = Array.isArray(body.answers) ? body.answers : null;
    // Snapshot des scores multi-axes (mode scoring uniquement). Validé
    // et borné côté serveur : triplets {points, min, max} finis, 6 axes
    // max. Invalide → ignoré silencieusement (le lead reste capturé).
    const scoresSnapshot =
      (quiz as { mode?: string | null }).mode === "scoring"
        ? sanitizeScoresSnapshot(body.scores)
        : null;

    // Données requête pour la Conversions API (Lead server-side). Le
    // meta_event_id vient du pixel navigateur → dédup. fbp/fbc/IP/UA
    // améliorent la qualité de correspondance (EMQ).
    const metaEventId = String(body.meta_event_id ?? "").trim();
    const clientIp =
      (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
      req.headers.get("x-real-ip") ||
      null;
    const userAgent = req.headers.get("user-agent");
    const referer = req.headers.get("referer");
    const fbp = req.cookies.get("_fbp")?.value ?? null;
    const fbc = req.cookies.get("_fbc")?.value ?? null;

    // L'AFFILIÉ QUI A AMENÉ CE LEAD (Maurice, 27 août 2026).
    //
    // Revalidé ici, jamais cru sur parole : la valeur vient du
    // navigateur, et elle finit dans une colonne puis sur la fiche
    // contact du vendeur.
    //
    // On n'écrit RIEN quand il n'y a rien : sans ce garde, un deuxième
    // passage sans affilié (le visiteur revient par un lien nu) écraserait
    // l'affilié du premier. L'upsert se fait sur `quiz_id,email`, donc
    // c'est le PREMIER qui l'a amené qui reste, comme partout ailleurs.
    const affiliate = lireAffiliateObjet((body as { affiliate?: unknown }).affiliate);
    const colonnesAffiliate = affiliateAbsent(affiliate)
      ? {}
      : {
          affiliate_sa: affiliate.sa,
          affiliate_ref: affiliate.ref,
          affiliate_canal: affiliate.canal,
        };

    const baseLead = {
      quiz_id: quizId,
      email,
      first_name: firstName || null,
      last_name: lastName || null,
      phone: phone || null,
      country: country || null,
      result_id: resultId,
      consent_given: Boolean(body.consent_given),
      ...(gender ? { gender } : {}),
      ...(answers ? { answers } : {}),
      ...(scoresSnapshot ? { scores: scoresSnapshot } : {}),
    };

    const ecrireLead = (extra: Record<string, unknown>) =>
      admin
        .from("quiz_leads")
        .upsert({ ...baseLead, ...extra }, { onConflict: "quiz_id,email" })
        .select("id, created_at")
        .single();

    let { data: lead, error } = await ecrireLead(colonnesAffiliate);

    // LA MIGRATION PEUT NE PAS ÊTRE ENCORE PASSÉE, et PostgREST rejette
    // l'écriture ENTIÈRE sur une colonne inconnue. Sans ce repli, un
    // déploiement en avance sur la base ferait échouer TOUTES les
    // captures : plus un seul lead, sur tous les quiz, pendant que
    // l'écran continue d'afficher un formulaire qui a l'air de marcher.
    //
    // C'est exactement le drame `quiz_events.meta` (15 jours de
    // statistiques perdues en juin), et il coûterait ici des leads, pas
    // des compteurs.
    if (error && Object.keys(colonnesAffiliate).length > 0 && colonneInconnue(error)) {
      console.error(
        "[quiz/public] colonnes affiliate absentes en base : lead enregistre SANS sa provenance. " +
          "Appliquer supabase/migrations/20260827_quiz_lead_affilie.sql",
      );
      ({ data: lead, error } = await ecrireLead({}));
    }

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    // Log business_event (fire-and-forget, non bloquant). On loggue
    // aussi pour les sondages anonymes : un lead capturé reste un lead
    // pour les milestones/stats du créateur (le side-effect commercial
    // — SIO, CAPI — est ce qu'on skippe pour l'anonyme, pas le tracking
    // interne). Dedup par email → 1 event par email par quiz.
    if (lead?.id && quiz.user_id) {
      logBusinessEvent({
        userId: quiz.user_id,
        // Multiprofils : lead taggué au projet du quiz, pas au cookie
        // du visiteur (qui ne nous appartient pas).
        projectId: (quiz as { project_id?: string | null }).project_id ?? null,
        kind: "lead_captured",
        source: "internal",
        payload: { quizId, quizTitle: quiz.title, leadId: lead.id },
        dedupeKey: dedupeKeys.quizLead(quizId, email),
      }).catch(() => {});
    }

    // Notification créateur (best-effort, non bloquant) : email au
    // propriétaire quand une NOUVELLE réponse arrive, s'il n'a pas coupé
    // l'option (profiles.notify_responses). On ne notifie que sur un lead
    // fraîchement créé (created_at récent) pour éviter les doublons quand
    // un même email re-répond (upsert = update, created_at inchangé).
    if (lead?.id && quiz.user_id) {
      const createdAt = (lead as { created_at?: string | null }).created_at;
      const isNewLead = !createdAt || Date.now() - new Date(createdAt).getTime() < 15000;
      if (isNewLead) {
        notifyCreatorOfResponse({
          ownerUserId: quiz.user_id,
          quizId,
          quizTitle: quiz.title,
          quizMode: (quiz as { mode?: string | null }).mode ?? null,
          respondentEmail: isAnonymousSubmit ? null : email,
          respondentName: [firstName, lastName].filter(Boolean).join(" ") || null,
          resultId,
        }).catch(() => {});
      }
    }

    // Sondage anonyme : on a inséré la ligne pour alimenter l'agrégation,
    // mais on ne déclenche AUCUN side-effect commercial (pas de sync SIO,
    // pas de Lead CAPI Meta). Le visiteur n'a pas consenti à être contacté.
    if (lead?.id && !isAnonymousSubmit) {
      const leadId = lead.id;
      const quizUserId = quiz.user_id;
      const quizSioApiKeyId = (quiz as { sio_api_key_id?: string | null }).sio_api_key_id ?? null;
      const quizProjectId = (quiz as { project_id?: string | null }).project_id ?? null;
      // Tags par tranche de score (Véronique juillet 2026, opt-in
      // quizzes.sio_score_tags) : "score-bas", "sommeil-eleve"... pour
      // segmenter l'emailing selon le diagnostic. Calculés ici (hors
      // IIFE) pour capturer des valeurs stables.
      const scoreTags: string[] = [];
      if ((quiz as { sio_score_tags?: boolean | null }).sio_score_tags === true && scoresSnapshot) {
        const labels = resolveScoreLabels(
          (quiz as { score_labels?: unknown }).score_labels,
          (quiz as { locale?: string | null }).locale,
        );
        const trancheSlug = (pct: number) =>
          slugifyAxisLabel(labels[scoreTranche(pct)]) || scoreTranche(pct);
        if (scoresSnapshot.global.max - scoresSnapshot.global.min > 0) {
          scoreTags.push(`score-${trancheSlug(scorePercent(scoresSnapshot.global))}`);
        }
        for (const axis of normalizeScoringAxes((quiz as { scoring_axes?: unknown }).scoring_axes)) {
          const s = scoresSnapshot.axes?.[axis.id];
          if (!s || s.max - s.min <= 0) continue;
          scoreTags.push(`${axisSlug(axis)}-${trancheSlug(scorePercent(s))}`);
        }
      }

      (async () => {
        try {
          // Free-tier guard: skip SIO auto-sync if this brand-new lead is
          // already locked for the creator. Without this, a free creator
          // could lift the blur out-of-band by reading the lead in their
          // own Systeme.io account.
          const { data: planRow } = await admin
            .from("profiles")
            .select("plan")
            .eq("user_id", quizUserId)
            .maybeSingle();
          const plan = String((planRow as { plan?: string | null } | null)?.plan ?? "free");
          if (!isPaidPlan(plan)) {
            const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
            const { data: ownedQuizzes } = await admin
              .from("quizzes")
              .select("id")
              .eq("user_id", quizUserId);
            const ownedQuizIds = (ownedQuizzes ?? []).map((q: { id: string }) => q.id);
            if (ownedQuizIds.length > 0) {
              const { count } = await admin
                .from("quiz_leads")
                .select("id", { count: "exact", head: true })
                .in("quiz_id", ownedQuizIds)
                .gte("created_at", since);
              if (isNewLeadLocked(count ?? 0, plan)) return;
            }
          }

          // Cascade: explicit quiz key → DEFAULT DU PROJET DU QUIZ →
          // any key DU PROJET → legacy plaintext. Le projectId scope
          // les étapes default/any sur le bon projet (Phase 6 multiprofils).
          // La résolution par explicitKeyId reste cross-project pour
          // préserver les quizzes en ligne qui pointent vers une clé
          // spécifique (sans coupure des sync existants).
          const resolved = await resolveApiKey(quizUserId, {
            explicitKeyId: quizSioApiKeyId,
            projectId: quizProjectId,
          });
          if (!resolved) return;
          const apiKey = resolved.apiKey;

          let resultTags: string[] = [];
          let courseId = "";
          let communityId = "";
          let resultTitle = "";
          if (resultId) {
            const { data: result } = await admin
              .from("quiz_results")
              .select("sio_tag_name, sio_tag_names, sio_course_id, sio_community_id, title")
              .eq("id", resultId)
              .maybeSingle();
            // Multi-tags par profil (Gwenn 12 juillet 2026) : on applique
            // TOUS les tags de sio_tag_names ; fallback sur l'ancien
            // sio_tag_name single si le tableau est vide (profils existants).
            const rawTags = (result as Record<string, unknown>)?.sio_tag_names;
            const arrTags = Array.isArray(rawTags)
              ? rawTags.map((v) => String(v ?? "").trim()).filter(Boolean)
              : [];
            const singleTag = String((result as Record<string, unknown>)?.sio_tag_name ?? "").trim();
            resultTags = arrTags.length > 0 ? arrTags : (singleTag ? [singleTag] : []);
            courseId = String((result as Record<string, unknown>)?.sio_course_id ?? "").trim();
            communityId = String((result as Record<string, unknown>)?.sio_community_id ?? "").trim();
            resultTitle = String((result as Record<string, unknown>)?.title ?? "").trim();
          }

          const sioContactId = await ensureSioContact(apiKey, email, {
            firstName: firstName || undefined,
            surname: lastName || undefined,
            phoneNumber: phone || undefined,
            country: country || undefined,
          });
          if (!sioContactId) return;

          // Sondage : pas de resultat, donc on applique le tag de capture
          // defini au niveau du sondage (quizzes.sio_capture_tag). Les quiz
          // gardent leur tag par resultat inchange.
          const isSurveyLead = (quiz as { mode?: string | null }).mode === "survey";
          const surveyCaptureTag = isSurveyLead
            ? String((quiz as { sio_capture_tag?: string | null }).sio_capture_tag ?? "").trim()
            : "";

          // Tags PAR RÉPONSE de sondage (Gwenn 19 juil 2026) : chaque option
          // choisie peut porter un tag Systeme.io (choix simple ou multiple).
          // Les réponses sont indexées (question_index + option_indices), on
          // relie donc chaque index d'option à son sio_tag_name.
          const answerTags: string[] = [];
          if (isSurveyLead && Array.isArray(answers) && answers.length > 0) {
            try {
              const { data: qRows } = await admin
                .from("quiz_questions")
                .select("id, options, sort_order")
                .eq("quiz_id", quizId)
                .order("sort_order", { ascending: true })
                .order("id", { ascending: true });
              const questionRows = (qRows ?? []) as Array<{ id?: string; options?: unknown }>;
              const questionOptions = questionRows.map(
                (r) => (r.options as Array<{ sio_tag_name?: string | null }> | null) ?? [],
              );
              // Identité stable : on relie la réponse à SA question par id,
              // pas par position. Sinon, une question supprimée au milieu
              // fait appliquer les tags de la mauvaise question.
              const positions = buildQuestionPositions(questionRows);
              for (const a of answers as Array<{
                question_index?: number;
                question_id?: string | null;
                option_indices?: number[];
              }>) {
                const qIdx = resolveQuestionPosition(a, positions, questionRows.length);
                const opts = qIdx === null ? null : questionOptions[qIdx];
                if (!opts) continue;
                const chosen = Array.isArray(a?.option_indices) ? a.option_indices : [];
                for (const oIdx of chosen) {
                  const tag = String(opts[Number(oIdx)]?.sio_tag_name ?? "").trim();
                  if (tag) answerTags.push(tag);
                }
              }
            } catch (e) {
              console.error("[survey answer tags] error:", e);
            }
          }

          const tagsToApply = [...resultTags, surveyCaptureTag, ...answerTags, ...scoreTags]
            .map((t) => t.trim())
            .filter((t, i, arr) => t && arr.findIndex((x) => x.toLowerCase() === t.toLowerCase()) === i);

          for (const tagName of tagsToApply) {
            try {
              const tagId = await ensureSioTag(apiKey, tagName);
              if (!tagId) continue;
              await sioFetch(apiKey, `/contacts/${sioContactId}/tags`, {
                method: "POST",
                body: { tagId },
              });
            } catch (e) {
              console.error("[Systeme.io tag apply] Error:", e);
            }
          }

          if (resultTitle) await enrichSioContact(apiKey, sioContactId, resultTitle);
          // ON N'ÉCRIT PAS L'AFFILIÉ SUR LA FICHE CONTACT, et c'est une
          // correction (Béné, 27 août 2026).
          //
          // Systeme.io porte DÉJÀ l'affilié nativement sur le contact :
          // "Identifiant affilié" et "Affilié" apparaissent sur sa fiche,
          // renseignés tout seuls quand la personne arrive par un lien
          // qui porte `?sa=`. Un champ personnalisé en plus n'aurait rien
          // ajouté, aurait demandé au vendeur de le créer dans son compte,
          // et aurait échoué EN SILENCE s'il ne le faisait pas (Systeme.io
          // accepte un slug inconnu et l'ignore).
          //
          // Ce qui déclenche leur mécanique, c'est que le visiteur
          // atterrisse sur LEUR page avec l'identifiant : c'est le rôle de
          // `attacherAffiliate` sur le bouton de fin de quiz. Nos colonnes
          // `affiliate_*` servent NOS statistiques, rien d'autre.
          if (courseId) await enrollInSioCourse(apiKey, courseId, sioContactId);
          if (communityId) await addToSioCommunity(apiKey, communityId, sioContactId);

          await admin
            .from("quiz_leads")
            .update({
              sio_synced: true,
              sio_synced_at: new Date().toISOString(),
              sio_tag_applied: tagsToApply.join(",") || null,
              sio_last_attempt_at: new Date().toISOString(),
              sio_last_error: null,
            })
            .eq("id", leadId);
        } catch (e) {
          console.error("[Systeme.io auto-tag POST] Error:", e);
          try {
            await admin
              .from("quiz_leads")
              .update({
                sio_last_attempt_at: new Date().toISOString(),
                sio_last_error: e instanceof Error ? e.message.slice(0, 500) : String(e).slice(0, 500),
              })
              .eq("id", leadId);
          } catch {
            /* the lead may have been deleted concurrently; ignore */
          }
        }
      })();

      // ── Meta Conversions API : Lead server-side (dédup via event_id
      //    partagé avec le pixel navigateur). Fire-and-forget, no-op si
      //    pas de pixel/token configuré. Le token (secret) reste serveur.
      (async () => {
        try {
          if (!metaEventId) return;
          const { data: prof } = await admin
            .from("profiles")
            .select("default_meta_pixel_id, default_meta_capi_token")
            .eq("user_id", quizUserId)
            .maybeSingle();
          const p = prof as {
            default_meta_pixel_id?: string | null;
            default_meta_capi_token?: string | null;
          } | null;
          const pixelId =
            String((quiz as { meta_pixel_id?: string | null }).meta_pixel_id ?? "").trim() ||
            (p?.default_meta_pixel_id?.trim() ?? "");
          const token = p?.default_meta_capi_token?.trim() ?? "";
          if (!pixelId || !token) return;
          await sendCapiLead({
            pixelId,
            token,
            eventId: metaEventId,
            eventSourceUrl: referer,
            contentName: (quiz as { title?: string | null }).title ?? null,
            user: { email, firstName, lastName, phone, country, clientIp, userAgent, fbp, fbc },
          });
        } catch (e) {
          console.error("[Tiquiz][CAPI] Lead POST error:", e);
        }
      })();
    }

    return NextResponse.json({ ok: true, leadId: lead?.id });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}

// ── PATCH — mark share + auto-apply share tag ──────────────────

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { quizId: slugOrId } = await context.params;
    const admin = supabaseAdmin;

    const quizId = await resolveQuizId(admin, slugOrId);
    if (!quizId) {
      return NextResponse.json({ ok: false, error: "Quiz not found" }, { status: 404 });
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
    }

    const email = String(body.email ?? "").trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ ok: false, error: "Valid email required" }, { status: 400 });
    }

    const { data: updatedLeads, error: updateErr } = await admin
      .from("quiz_leads")
      .update({ has_shared: true, bonus_unlocked: true })
      .eq("quiz_id", quizId)
      .eq("email", email)
      .select("id");

    if (updateErr) {
      return NextResponse.json({ ok: false, error: updateErr.message }, { status: 500 });
    }

    if (!updatedLeads || updatedLeads.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Lead not found for this email" },
        { status: 404 },
      );
    }

    // Pull sio_api_key_id so the share tag is applied on the same SIO
    // workspace as the lead's original capture sync.
    const { data: quiz } = await admin
      .from("quizzes")
      .select("sio_share_tag_name, user_id, sio_api_key_id, project_id")
      .eq("id", quizId)
      .maybeSingle();

    if (quiz) {
      // INSERT direct dans quiz_events → trigger bumpe shares_count. On évite
      // la RPC log_quiz_event : l'appel à 2 args était ambigu entre les
      // surcharges (2/3/4 args) → échec silencieux → 0 partage compté.
      const { error: shareErr } = await admin
        .from("quiz_events")
        .insert({ quiz_id: quizId, event_type: "share", meta: null, session_id: null });
      if (shareErr) console.error("[public/share] quiz_events insert failed", shareErr);

      const quizRow = quiz as {
        sio_share_tag_name?: string | null;
        user_id?: string;
        sio_api_key_id?: string | null;
        project_id?: string | null;
      };

      // Log business_event (fire-and-forget). Dedup par email → pas de
      // double comptage si le visiteur partage depuis 2 onglets.
      if (!shareErr && quizRow.user_id) {
        logBusinessEvent({
          userId: quizRow.user_id,
          projectId: quizRow.project_id ?? null,
          kind: "quiz_share",
          source: "internal",
          payload: { quizId, side: "server", email },
          dedupeKey: dedupeKeys.quizShare(quizId, email.toLowerCase()),
        }).catch(() => {});
      }
      const shareTagName = String(quizRow.sio_share_tag_name ?? "").trim();
      const quizUserId = quizRow.user_id;
      const quizSioApiKeyId = quizRow.sio_api_key_id ?? null;
      const quizProjectId = quizRow.project_id ?? null;

      if (shareTagName && quizUserId) {
        (async () => {
          try {
            // Même cascade que POST avec scope projet (Phase 6).
            const resolved = await resolveApiKey(quizUserId, {
              explicitKeyId: quizSioApiKeyId,
              projectId: quizProjectId,
            });
            if (!resolved) return;
            await applyTagToContact(resolved.apiKey, email, shareTagName);
          } catch (e) {
            console.error("[Systeme.io auto-tag PATCH] Error:", e);
          }
        })();
      }
    }

    return NextResponse.json({ ok: true, bonus_unlocked: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}
