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

// No `force-dynamic`: it would make Vercel inject `Cache-Control: private, no-store`,
// overriding the edge-SWR headers set on the GET response and forcing `cf-cache-status: DYNAMIC`.
export const maxDuration = 30;

type RouteContext = { params: Promise<{ quizId: string }> };

const SIO_BASE = "https://api.systeme.io/api";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function resolveQuizId(
  admin: typeof supabaseAdmin,
  slugOrId: string,
  opts: { requireActive?: boolean } = {},
): Promise<string | null> {
  const needle = slugOrId.trim();
  if (!needle) return null;

  if (UUID_RE.test(needle)) {
    const q = admin.from("quizzes").select("id").eq("id", needle);
    const { data } = opts.requireActive ? await q.eq("status", "active").maybeSingle() : await q.maybeSingle();
    if (data?.id) return data.id as string;
  }

  const q = admin.from("quizzes").select("id").ilike("slug", needle);
  const { data } = opts.requireActive ? await q.eq("status", "active").maybeSingle() : await q.maybeSingle();
  return (data?.id as string) ?? null;
}

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
function hostnameLabel(url: string): string {
  const raw = url.trim();
  try {
    const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    return new URL(withProto).hostname.replace(/^www\./i, "");
  } catch {
    return raw.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/.*$/, "");
  }
}

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
    const admin = supabaseAdmin;

    // Embed preview path: an anonymous embed visitor wants to see
    // their (still-draft, still-anonymous) quiz play live before
    // checkout. We skip the active-status filter when the URL carries
    // ?embed=<UUID> AND the resolved row's embed_session_id matches.
    // This never exposes another user's draft because:
    //   1) the token is a unique UUID stored in localStorage / URL
    //   2) we re-check the embed_session_id on the row itself below
    const embedToken = (() => {
      const raw = req.nextUrl.searchParams.get("embed");
      return raw && UUID_RE.test(raw) ? raw : null;
    })();

    // Owner preview path : si l'user est authentifié et propriétaire
    // du quiz, on l'autorise à voir ses brouillons via l'URL publique
    // (clic "Aperçu" depuis l'éditeur). Avant ce fix le filtre
    // status='active' renvoyait 404 même au créateur, donc il voyait
    // un état vide et croyait qu'il n'y avait pas d'aperçu (bug
    // Fabienne 2026-05-09 sur Tipote, port ici).
    let authUserId: string | null = null;
    try {
      const supabase = await getSupabaseServerClient();
      const { data: { user } } = await supabase.auth.getUser();
      authUserId = user?.id ?? null;
    } catch {
      // anonymous, fine
    }

    // Si l'user est connecté on relâche le filtre `requireActive`
    // — la vérification d'ownership se fait juste après.
    const quizId = await resolveQuizId(admin, slugOrId, {
      requireActive: !embedToken && !authUserId,
    });
    if (!quizId) {
      return NextResponse.json({ ok: false, error: "Quiz not found or inactive" }, { status: 404 });
    }

    if (embedToken) {
      const { data: gate } = await admin
        .from("quizzes")
        .select("embed_session_id, user_id")
        .eq("id", quizId)
        .maybeSingle();
      if (!gate || gate.user_id !== null || gate.embed_session_id !== embedToken) {
        return NextResponse.json({ ok: false, error: "Preview token mismatch" }, { status: 404 });
      }
    }

    const [quizRes, questionsRes, resultsRes] = await Promise.all([
      admin.from("quizzes").select("id,user_id,project_id,status,title,introduction,cta_text,cta_url,start_button_text,privacy_url,consent_text,virality_enabled,bonus_description,bonus_heading,bonus_intro_text,bonus_image_url,bonus_image_position,bonus_image_width,bonus_unlocked_message,share_message,locale,address_form,views_count,capture_heading,capture_subtitle,capture_submit_text,survey_thanks_heading,survey_thanks_body,capture_first_name,capture_last_name,capture_phone,capture_country,phone_required,first_name_required,last_name_required,country_required,ask_first_name,ask_gender,slug,brand_font,brand_color_primary,brand_color_background,brand_color_text,brand_logo_url,hide_brand_logo,capture_enabled,capture_before_questions,show_aggregate_responses,custom_footer_text,custom_footer_url,hide_branding,share_networks,og_description,og_image_url,result_insight_heading,result_projection_heading,mode,show_consent_checkbox,show_results_breakdown,show_other_results,meta_pixel_id,ga4_measurement_id,google_ads_conversion_id,google_ads_conversion_label,intro_image_url,intro_image_position,intro_image_width,background_style,background_gradient,background_image_url,intro_layout,button_shape,question_layout,split_image_url,split_side,panel_media,answer_layout,show_result_insight,show_result_projection,show_result_share,share_result_page,close_enabled,close_action,close_redirect_url,close_message,close_cta_text,close_cta_url").eq("id", quizId).maybeSingle(),
      admin.from("quiz_questions").select("id,question_text,options,sort_order,question_type,config").eq("quiz_id", quizId).order("sort_order"),
      admin.from("quiz_results").select("id,title,description,insight,projection,insight_heading,projection_heading,cta_text,cta_url,sort_order,image_url,image_position,image_width,min_score,max_score").eq("quiz_id", quizId).order("sort_order"),
    ]);

    if (!quizRes.data) {
      return NextResponse.json({ ok: false, error: "Quiz not found or inactive" }, { status: 404 });
    }

    const quizRow = quizRes.data as Record<string, unknown>;
    const quizUserId = quizRow.user_id as string | undefined;
    const quizStatus = String(quizRow.status ?? "");

    // Validate status for non-embed paths : actif = public, draft =
    // owner-preview only (l'embedToken a déjà été validé plus haut).
    const isActive = quizStatus === "active";
    let isOwnerPreview = false;
    if (!isActive && !embedToken) {
      if (authUserId && quizUserId && authUserId === quizUserId) {
        isOwnerPreview = true;
      } else {
        return NextResponse.json(
          { ok: false, error: "Quiz not found or inactive" },
          { status: 404 },
        );
      }
    }

    const quizAddressForm = quizRow.address_form as string | null;
    let addressForm = quizAddressForm === "tu" || quizAddressForm === "vous" ? quizAddressForm : "tu";
    let fallbackPrivacyUrl = "";
    let profileRow: Record<string, unknown> | null = null;

    if (quizUserId) {
      const { data: bp, error: bpErr } = await admin
        .from("profiles")
        .select("address_form, privacy_url, brand_logo_url, brand_font, brand_color_primary, plan, reseller_id, tipote_affiliate_id, default_meta_pixel_id, default_ga4_measurement_id, default_google_ads_conversion_id, default_google_ads_conversion_label, ui_locale, default_content_locale")
        .eq("user_id", quizUserId)
        .maybeSingle();
      profileRow = (bp as Record<string, unknown>) ?? null;
      if (bpErr) {
        // Drame footer 27 juillet 2026 : une colonne referencee ici sans
        // migration appliquee (default_content_locale) faisait echouer TOUT
        // le select en silence -> profil null -> plan lu "free" pour tout le
        // monde -> footer perso / masquage / affilie / branding de repli /
        // pixels par defaut morts, meme pour les lifetime. On logge FORT et
        // on retente avec le socle de colonnes historiques pour que le plan
        // et le branding survivent a une colonne recente manquante.
        console.error("[quiz/public] profiles select failed (migration manquante ?):", bpErr.message);
        const { data: bpRetry } = await admin
          .from("profiles")
          .select("address_form, privacy_url, brand_logo_url, brand_font, brand_color_primary, plan, reseller_id, tipote_affiliate_id")
          .eq("user_id", quizUserId)
          .maybeSingle();
        profileRow = (bpRetry as Record<string, unknown>) ?? null;
      }

      // Multiprofils Tiquiz phase 5 : si le quiz est attaché à un
      // projet précis (quiz.project_id), on merge le business_profile
      // de ce projet PAR DESSUS le row profiles. Garantit "nouveau
      // projet = nouveau branding" sur le viewer public.
      //
      // SAFE POUR LES QUIZ EN LIGNE : si business_profile absent OU
      // project_id null OU table inexistante → on retombe sur profileRow
      // INCHANGÉ (= comportement actuel exact). JAMAIS de coupure.
      if (profileRow) {
        profileRow = await mergeOwnerBranding(
          profileRow,
          quizUserId,
          (quizRow.project_id as string | null) ?? null,
        );
      }

      if (!quizAddressForm) {
        addressForm = profileRow?.address_form === "vous" ? "vous" : "tu";
      }
      fallbackPrivacyUrl = String(profileRow?.privacy_url ?? "").trim();
    }

    const branding = resolveQuizBranding(
      {
        brand_font: quizRow.brand_font as string | null,
        brand_color_primary: quizRow.brand_color_primary as string | null,
        brand_color_background: quizRow.brand_color_background as string | null,
        brand_color_text: quizRow.brand_color_text as string | null,
        brand_logo_url: quizRow.brand_logo_url as string | null,
        hide_brand_logo: quizRow.hide_brand_logo as boolean | null,
        background_style: quizRow.background_style as string | null,
        background_gradient: quizRow.background_gradient as string | null,
        background_image_url: quizRow.background_image_url as string | null,
        intro_layout: quizRow.intro_layout as string | null,
        button_shape: quizRow.button_shape as string | null,
        question_layout: quizRow.question_layout as string | null,
        split_image_url: quizRow.split_image_url as string | null,
        split_side: quizRow.split_side as string | null,
        panel_media: quizRow.panel_media,
        answer_layout: quizRow.answer_layout as string | null,
      },
      {
        brand_font: profileRow?.brand_font as string | null,
        brand_color_primary: profileRow?.brand_color_primary as string | null,
        brand_logo_url: profileRow?.brand_logo_url as string | null,
      },
    );

    // Custom footer is a paid-plan feature: hide it for free creators
    // (and only for free — beta / lifetime / monthly / yearly all keep it).
    // Permissive check via isPaidPlan: anything that isn't `free` counts as
    // paid, so future plan slugs don't accidentally lose the custom footer
    // until this file is updated.
    //
    // WHITE-LABEL REVENDEURS (Béné 14 juillet 2026) : un sous-compte
    // revendeur (profiles.reseller_id non nul) voit SON footer même en
    // gratuit — le revendeur gère sa propre marque, pas de "offert par
    // Tiquiz" imposé à ses clients.
    const ownerPlan = String(profileRow?.plan ?? "free").trim();
    const isResellerSub = Boolean(profileRow?.reseller_id);
    const footerAllowed = isPaidPlan(ownerPlan) || isResellerSub;

    // Résolution du footer : priorité au champ PAR QUIZ (onglet Partager),
    // sinon fallback sur l'URL du Branding profil (brand_website_url) +
    // son nom de site (share_site_name). Gwenn 12 juillet 2026 : "j'ai mis
    // l'url du site dans le branding" -> elle s'attend à la voir dans le
    // footer sans repasser par le champ par-quiz.
    const perQuizFooterText = String(quizRow.custom_footer_text ?? "").trim();
    const perQuizFooterUrl = String(quizRow.custom_footer_url ?? "").trim();
    const brandSiteUrl = String(profileRow?.brand_website_url ?? "").trim();
    const brandSiteName = String(profileRow?.share_site_name ?? "").trim();
    const resolvedFooterUrl = perQuizFooterUrl || brandSiteUrl || "";
    let resolvedFooterText = perQuizFooterText;
    if (resolvedFooterUrl && !resolvedFooterText) {
      // Pas de texte fourni : on prend le nom du site du branding, sinon le
      // hostname de l'URL (lisible), pour que TiquizFooter (qui exige texte
      // ET url) affiche bien le footer perso.
      resolvedFooterText = brandSiteName || hostnameLabel(resolvedFooterUrl);
    }
    const customFooterText = footerAllowed && resolvedFooterText ? resolvedFooterText : null;
    const customFooterUrl = footerAllowed && resolvedFooterUrl ? resolvedFooterUrl : null;
    // Masquer completement le footer Tiquiz : reserve aux plans payants (meme
    // gate que le footer perso). Un free ne peut jamais retirer la mention.
    const hideBranding = footerAllowed && Boolean(quizRow.hide_branding);

    // Refonte tracking (Adeline, 19 mai 2026) : le view tracking
    // n'est PLUS fait ici (server-side, à chaque GET) parce que :
    //   - bots qui n'exécutent pas JS comptaient quand même
    //   - refreshes / preloads gonflaient les chiffres
    //   - le créateur qui partageait son lien le voyait compté
    // Le visiteur fire maintenant un event "view" via POST /track
    // depuis useEffect au mount → bot filtering + cookie dédup +
    // owner exclusion + insert via log_quiz_event RPC qui passe par
    // le trigger pour bumper le compteur. Source de vérité unique.

    // Strip user_id ET project_id : ce sont des infos internes
    // (multiprofils) qui n'ont rien à faire dans la réponse publique
    // servie aux visiteurs anonymes des quiz en ligne.
    const { user_id: _uid, project_id: _pid, ...quizPublic } = quizRow;
    void _uid;
    void _pid;

    // Pixel effectif : si le quiz n'a aucun ID, on fallback sur les
    // défauts du profil. Sinon poser le pixel dans /settings n'aurait
    // aucun effet sur les events conversion (Lead/share) côté client.
    // Le pixel server-rendered (PageView) applique la même logique.
    const quizHasPixel =
      String(quizPublic.meta_pixel_id ?? "").trim() ||
      String(quizPublic.ga4_measurement_id ?? "").trim() ||
      String(quizPublic.google_ads_conversion_id ?? "").trim();
    if (!quizHasPixel && profileRow) {
      quizPublic.meta_pixel_id = (String(profileRow.default_meta_pixel_id ?? "").trim() || null);
      quizPublic.ga4_measurement_id = (String(profileRow.default_ga4_measurement_id ?? "").trim() || null);
      quizPublic.google_ads_conversion_id = (String(profileRow.default_google_ads_conversion_id ?? "").trim() || null);
      quizPublic.google_ads_conversion_label = (String(profileRow.default_google_ads_conversion_label ?? "").trim() || null);
    }
    const effectivePrivacyUrl = String(quizPublic.privacy_url ?? "").trim() || fallbackPrivacyUrl;

    // Edge-SWR resilience pour les visiteurs : si l'origine est down
    // (deploy / crash / DB hiccup) on continue à servir la dernière
    // bonne réponse. On garde 60s de fresh + 60s de stale-while-
    // revalidate (au lieu de 86400/24h précédent) — sinon, quand le
    // créateur édite ses couleurs / titre, un visiteur ayant déjà
    // ouvert l'URL voyait l'ancienne version pendant 24h alors qu'un
    // hard refresh aurait suffi. Bug remonté par Adeline (16 mai 2026,
    // "sur mon tel la couleur du quiz n'est pas la bonne"). 60s SWR
    // garantit que la prochaine requête après ~2 min serve le contenu
    // à jour, le tout sans rajouter de charge significative sur
    // l'origine.
    const cacheHeaders: Record<string, string> = (embedToken || isOwnerPreview)
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

    // G1 — display-time French typography for legacy data. Apply NBSP rules
    // when the quiz locale is French so quizzes saved before the on-save
    // typography pass landed still render correctly without a re-save.
    // Locale effective du joueur. La langue explicite du quiz gagne ; sinon on
    // retombe sur la langue de CONTENU par défaut du créateur, puis sur la
    // langue de son INTERFACE (compte). Un créateur anglophone a donc un joueur
    // en anglais même s'il n'a jamais réglé la langue du quiz (retour
    // utilisatrice anglophone, 21 juil 2026 : "si mon interface est en anglais,
    // tout doit être en anglais"). On écrit la valeur résolue dans quizPublic
    // pour qu'elle traverse jusqu'au client (getT(quiz.locale)).
    const rawQuizLocale = String((quizPublic as Record<string, unknown>).locale ?? "").trim();
    const ownerContentLocale = String(profileRow?.default_content_locale ?? "").trim();
    const ownerUiLocale = String(profileRow?.ui_locale ?? "").trim();
    const quizLocale = rawQuizLocale || ownerContentLocale || ownerUiLocale || null;
    (quizPublic as Record<string, unknown>).locale = quizLocale;
    const fr = (s: unknown) => (typeof s === "string" ? applyFrenchTypography(s, quizLocale) : s);
    const isFr = isFrenchLocale(quizLocale);
    const renderedQuiz = isFr
      ? Object.fromEntries(
          Object.entries(quizPublic).map(([k, v]) => {
            const FR_KEYS = new Set([
              "title", "introduction", "cta_text", "consent_text",
              "bonus_description", "bonus_heading", "bonus_intro_text", "share_message",
              "start_button_text", "capture_heading", "capture_subtitle", "capture_submit_text",
              "survey_thanks_heading", "survey_thanks_body",
              "result_insight_heading", "result_projection_heading",
              "og_description",
            ]);
            return [k, FR_KEYS.has(k) ? fr(v) : v];
          }),
        ) as typeof quizPublic
      : quizPublic;
    const renderedQuestions = (questionsRes.data ?? []).map((q: Record<string, unknown>) => {
      const opts = q.options as { text: string; result_index: number }[] | null | undefined;
      return {
        ...q,
        question_text: isFr ? fr(q.question_text) : q.question_text,
        options: opts ? opts.map((o) => ({ ...o, text: isFr ? (fr(o.text) as string) : o.text })) : opts,
        question_type: (q.question_type as string) ?? "multiple_choice",
        config: (q.config as Record<string, unknown>) ?? {},
      };
    });
    const renderedResults = (resultsRes.data ?? []).map((r: Record<string, unknown>) => ({
      ...r,
      title: isFr ? fr(r.title) : r.title,
      description: isFr ? fr(r.description) : r.description,
      insight: isFr ? fr(r.insight) : r.insight,
      projection: isFr ? fr(r.projection) : r.projection,
      insight_heading: isFr ? fr(r.insight_heading) : r.insight_heading,
      projection_heading: isFr ? fr(r.projection_heading) : r.projection_heading,
      cta_text: isFr ? fr(r.cta_text) : r.cta_text,
    }));

    return NextResponse.json({
      ok: true,
      // Flag remonté quand le quiz est servi en mode aperçu (créateur
      // sur un quiz draft) — le client affiche un toast pour informer
      // qu'il faut publier pour partager. Bug Fabienne 2026-05-09.
      isDraftPreview: isOwnerPreview,
      quiz: {
        ...renderedQuiz,
        address_form: addressForm,
        privacy_url: effectivePrivacyUrl || null,
        custom_footer_text: isFr && typeof customFooterText === "string" ? (fr(customFooterText) as string) : customFooterText,
        custom_footer_url: customFooterUrl,
        hide_branding: hideBranding,
        // Surfacé pour le footer "via Tiquiz" → tipote.fr/part-tiquiz?sa=<id>
        // (tracking commission affilié quand le créateur l'a posé en Settings).
        tipote_affiliate_id: (String(profileRow?.tipote_affiliate_id ?? "").trim() || null),
        // Fermeture du quiz (createur). Renvoye tel quel : le client
        // redirige ou affiche le message de fermeture.
        close_enabled: quizRow.close_enabled === true,
        close_action: (quizRow.close_action as string | null) ?? null,
        close_redirect_url: (quizRow.close_redirect_url as string | null) ?? null,
        close_message: (quizRow.close_message as string | null) ?? null,
        close_cta_text: (quizRow.close_cta_text as string | null) ?? null,
        close_cta_url: (quizRow.close_cta_url as string | null) ?? null,
      },
      questions: renderedQuestions,
      results: renderedResults,
      branding,
    }, { headers: cacheHeaders });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}

// ── POST — submit lead + auto-tag in Systeme.io ────────────────

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
      .select("id, user_id, title, sio_api_key_id, meta_pixel_id, mode, capture_enabled, project_id, sio_capture_tag")
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

    const { data: lead, error } = await admin
      .from("quiz_leads")
      .upsert(
        {
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
        },
        { onConflict: "quiz_id,email" },
      )
      .select("id, created_at")
      .single();

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
                .select("options, sort_order")
                .eq("quiz_id", quizId)
                .order("sort_order", { ascending: true });
              const questionOptions = (qRows ?? []).map(
                (r) => ((r as { options?: unknown }).options as Array<{ sio_tag_name?: string | null }> | null) ?? [],
              );
              for (const a of answers as Array<{ question_index?: number; option_indices?: number[] }>) {
                const qIdx = Number(a?.question_index);
                const opts = Number.isInteger(qIdx) ? questionOptions[qIdx] : null;
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

          const tagsToApply = [...resultTags, surveyCaptureTag, ...answerTags]
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
