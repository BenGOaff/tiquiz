// app/[publicSlug]/page.tsx
//
// Catch-all that serves quizzes / popquizzes at the root of a creator
// custom domain — `test.ethilife.fr/<slug>` instead of the longer
// `/q/<slug>` or `/p/<slug>`. The existing prefixed routes still work
// (backwards-compat with anything already shared in the wild) and are
// the only thing that resolves on the main host quiz.tipote.com,
// where this catch-all 404s because we never want `/dashboard`,
// `/settings`, etc. to be shadowed.
//
// Routing decision:
//   1. No custom-domain context → notFound() (we're on the main host).
//   2. Lookup `quizzes` for (slug, owner) → render PublicQuizClient.
//   3. Else lookup `popquizzes` → render PopquizPlayClient.
//   4. Else notFound().
//
// Cross-type uniqueness is enforced at save time (see lib/publicSlug
// + the slug branches of /api/quiz/[id] and /api/popquiz/[id]) so a
// single slug can only belong to one of the two — no ambiguity here.

import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { fetchPublishedPopquiz } from "@/lib/popquiz/repo";
import PublicQuizClient from "@/components/quiz/PublicQuizClient";
import PopquizPlayClient from "@/app/p/[popquizId]/PopquizPlayClient";
import { TrackingPixels } from "@/components/tracking/TrackingPixels";
import { resolveEffectivePixels } from "@/lib/effectivePixels";
import { isReservedPublicSlug } from "@/lib/publicSlug";
import { stripHtml } from "@/lib/richText";
import { interpolateText } from "@/lib/quizPersonalization";
import { buildCanonicalUrl, fetchOwnerBranding } from "@/lib/publicUrl";

export const dynamic = "force-dynamic";

// App Facebook de Bene (facultatif) : quand FACEBOOK_APP_ID est pose,
// on emet fb:app_id et le debogueur FB n'affiche plus d'avertissement.
const FB_APP_ID = (process.env.FACEBOOK_APP_ID ?? "").trim();

const CUSTOM_HOST_HEADER = "x-tiquiz-custom-host";

type Props = { params: Promise<{ publicSlug: string }>; searchParams?: Promise<{ rp?: string }> };

// "J'ai obtenu : <profil>" dans la langue du quiz (partage de resultat
// ?rp=<resultId>), parite avec /q/[quizId].
const OG_GOT: Record<string, (t: string) => string> = {
  fr: (t) => `J'ai obtenu : ${t}`,
  en: (t) => `I got: ${t}`,
  es: (t) => `He obtenido: ${t}`,
  de: (t) => `Mein Ergebnis: ${t}`,
  pt: (t) => `Meu resultado: ${t}`,
  it: (t) => `Ho ottenuto: ${t}`,
  ar: (t) => `حصلت على: ${t}`,
};

async function resolveCustomDomainOwner(): Promise<string | null> {
  const h = await headers();
  const host = h.get(CUSTOM_HOST_HEADER);
  if (!host) return null;
  const { data } = await supabaseAdmin
    .from("custom_domains")
    .select("user_id")
    .ilike("hostname", host)
    .eq("status", "verified")
    .maybeSingle();
  return (data?.user_id as string | undefined) ?? null;
}

type ResolvedPopquiz = NonNullable<Awaited<ReturnType<typeof fetchPublishedPopquiz>>>;
type Resolved =
  | { kind: "quiz"; meta: { id?: string | null; title?: string | null; introduction?: string | null; og_image_url?: string | null; og_description?: string | null; share_message?: string | null; locale?: string | null; meta_pixel_id?: string | null; ga4_measurement_id?: string | null; google_ads_conversion_id?: string | null } }
  | { kind: "popquiz"; popquiz: ResolvedPopquiz }
  | null;

// Single resolver used by both generateMetadata and the page body so
// we don't hit the DB twice per request.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolve(slug: string, ownerId: string): Promise<Resolved> {
  // Le `slug` peut être l'ID (UUID) du quiz : quand un quiz n'a pas de
  // slug custom, l'éditeur construit l'URL live avec `quiz.id` (handle
  // = slug ?? id) → sur custom domain ça donne `/<uuid>`. Sans le
  // match par id ci-dessous, le quiz publie un lien qui 404 (drame
  // Christelle 8 juin 2026, quiz.vacge.com/<uuid> mort silencieusement).
  // On matche d'abord par id si c'est un UUID, sinon par slug.
  const quizBase = supabaseAdmin
    .from("quizzes")
    .select("id, title, introduction, og_image_url, og_description, share_message, locale, meta_pixel_id, ga4_measurement_id, google_ads_conversion_id")
    .eq("user_id", ownerId)
    .eq("status", "active");
  const { data: quiz } = await (
    UUID_RE.test(slug) ? quizBase.eq("id", slug) : quizBase.ilike("slug", slug)
  ).maybeSingle();
  if (quiz) return { kind: "quiz", meta: quiz };

  // Popquiz path: owner-gate first (cheap), then fetch the full object
  // only if it belongs to this domain's owner. fetchPublishedPopquiz
  // does not expose user_id on the returned shape, hence the split.
  // Même règle UUID-or-slug que pour quizzes (cf. supra).
  const ownerGate = supabaseAdmin
    .from("popquizzes")
    .select("id")
    .eq("user_id", ownerId)
    .eq("is_published", true);
  const { data: pqOwner } = await (
    UUID_RE.test(slug) ? ownerGate.eq("id", slug) : ownerGate.ilike("slug", slug)
  ).maybeSingle();
  if (!pqOwner) return null;

  const popquiz = await fetchPublishedPopquiz(slug);
  if (!popquiz) return null;
  return { kind: "popquiz", popquiz };
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { publicSlug } = await params;
  const sp = searchParams ? await searchParams : {};
  const rp = typeof sp?.rp === "string" && UUID_RE.test(sp.rp) ? sp.rp : null;
  if (isReservedPublicSlug(publicSlug)) return {};
  const owner = await resolveCustomDomainOwner();
  if (!owner) return {};
  const r = await resolve(publicSlug, owner);
  if (!r) return {};

  // Canonical = current request URL on the creator's custom domain.
  // Drives og:url so iMessage / WhatsApp / Slack display the branded
  // hostname under the share preview instead of the multi-tenant main
  // host. See lib/publicUrl.ts for the why.
  const canonical = await buildCanonicalUrl(`/${publicSlug}`);

  // Branding owner (custom domain + share_site_name).
  // Cette route est forcément sur un custom domain — sinon `owner` est
  // null et on a déjà return {} plus haut — donc branding est rarement
  // null ici, sauf race condition (domain dé-vérifié entre les 2 lookups).
  const customHost = (await headers()).get(CUSTOM_HOST_HEADER);
  const branding = await fetchOwnerBranding(owner, customHost);
  const siteName = branding ? (branding.siteName || branding.customHost) : null;

  if (r.kind === "quiz") {
    // Adeline (19 mai 2026) : sur custom domain le preview iMessage /
    // WhatsApp affichait le code HTML brut (`<span style="color:rgb(82,
    // 152,152);">…`) au lieu du texte propre, parce que cette route
    // catch-all n'appliquait pas stripHtml — contrairement à /q/[id]
    // qui le faisait déjà depuis le 16 mai. On strip les deux champs
    // ici aussi (title + og_description) pour parité.
    const plainTitle = stripHtml(r.meta.title);
    const ogDescRaw = stripHtml(r.meta.og_description);
    // FB/LinkedIn n'affichent que l'apercu du lien : le message de partage
    // sert de description par defaut (retour Jocelyne 28 juillet 2026),
    // parite avec /q/[quizId].
    const shareMsgPlain = stripHtml((r.meta as { share_message?: string | null }).share_message);
    const introPlain = stripHtml(r.meta.introduction);
    const description = (ogDescRaw || shareMsgPlain || introPlain.slice(0, 160)).trim() || undefined;

    // Partage du PROFIL obtenu (?rp=) : og:title "J'ai obtenu : <profil>"
    // + visuel du profil (image du createur sinon carte generee), parite
    // avec /q/[quizId]. Retour Jocelyne 28 juillet 2026.
    let resultShare: { ogTitle: string; imageUrl: string } | null = null;
    const quizRowId = String((r.meta as { id?: string | null }).id ?? "");
    if (rp && quizRowId) {
      const { data: rrow } = await supabaseAdmin
        .from("quiz_results")
        .select("quiz_id, title, image_url")
        .eq("id", rp)
        .maybeSingle();
      if (rrow && rrow.quiz_id === quizRowId) {
        const cleanTitle = stripHtml(interpolateText(rrow.title as string, { name: "", gender: "x" }))
          .replace(/\s+/g, " ")
          .replace(/^[\s,;:.!?-]+/, "")
          .trim();
        if (cleanTitle) {
          const loc = String((r.meta as { locale?: string | null }).locale ?? "fr").split("-")[0];
          const got = (OG_GOT[loc] ?? OG_GOT.fr)(cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1));
          const generated =
            (await buildCanonicalUrl(`/api/quiz/${quizRowId}/result-og?rp=${rp}`)) ??
            `https://quiz.tipote.com/api/quiz/${quizRowId}/result-og?rp=${rp}`;
          const resultImage = String((rrow as { image_url?: string | null }).image_url ?? "").trim();
          resultShare = { ogTitle: got, imageUrl: resultImage || generated };
        }
      }
    }
    const ogUrl = canonical ? (resultShare && rp ? `${canonical}?rp=${rp}` : canonical) : null;
    const ogTitle = resultShare?.ogTitle ?? (plainTitle || "Quiz");
    // og:image TOUJOURS explicite (parite /q/[quizId]).
    const defaultOgImage = quizRowId
      ? (await buildCanonicalUrl(`/api/quiz/${quizRowId}/result-og`)) ??
        `https://quiz.tipote.com/api/quiz/${quizRowId}/result-og`
      : null;
    const ogImage = resultShare?.imageUrl ?? (String(r.meta.og_image_url ?? "").trim() || defaultOgImage);
    const titleOverride = siteName
      ? { absolute: `${plainTitle || "Quiz"} · ${siteName}` }
      : (plainTitle || "Quiz");
    return {
      title: titleOverride,
      description,
      ...(FB_APP_ID ? { other: { "fb:app_id": FB_APP_ID } } : {}),
      ...(siteName ? { applicationName: siteName } : {}),
      ...(branding?.faviconUrl
        ? {
            icons: {
              // sizes="any" pour battre Firefox qui préfère le link avec sizes
              // (le favicon Tiquiz par défaut) au nôtre. Cf. CLAUDE_PITFALLS.md O.
              icon: [{ url: branding.faviconUrl, sizes: "any" }],
              shortcut: branding.faviconUrl,
              apple: branding.faviconUrl,
            },
          }
        : {}),
      ...(canonical ? { alternates: { canonical } } : {}),
      ...(resultShare
        ? { robots: { index: false, follow: false, googleBot: { index: false, follow: false } } }
        : {}),
      openGraph: {
        title: ogTitle,
        description,
        type: "website",
        ...(siteName ? { siteName } : {}),
        ...(ogUrl ? { url: ogUrl } : {}),
        ...(ogImage ? { images: [{ url: ogImage }] } : {}),
      },
      twitter: {
        card: "summary_large_image",
        title: ogTitle,
        ...(description ? { description } : {}),
        ...(ogImage ? { images: [ogImage] } : {}),
      },
    };
  }

  // popquiz
  const p = r.popquiz;
  const titleOverridePq = siteName
    ? { absolute: `${p.title} · ${siteName}` }
    : p.title;
  return {
    title: titleOverridePq,
    description: p.description ?? undefined,
    ...(siteName ? { applicationName: siteName } : {}),
    ...(canonical ? { alternates: { canonical } } : {}),
    openGraph: {
      title: p.title,
      description: p.description ?? undefined,
      ...(siteName ? { siteName } : {}),
      ...(canonical ? { url: canonical } : {}),
      ...(p.video.thumbnailUrl ? { images: [{ url: p.video.thumbnailUrl }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: p.title,
      ...(p.description ? { description: p.description } : {}),
      ...(p.video.thumbnailUrl ? { images: [p.video.thumbnailUrl] } : {}),
    },
  };
}

export default async function PublicCatchAll({ params }: Props) {
  const { publicSlug } = await params;
  if (isReservedPublicSlug(publicSlug)) notFound();

  const owner = await resolveCustomDomainOwner();
  if (!owner) notFound();

  const r = await resolve(publicSlug, owner);
  if (!r) notFound();

  if (r.kind === "quiz") {
    const pixels = await resolveEffectivePixels(r.meta, owner);
    return (
      <>
        <TrackingPixels
          metaPixelId={pixels.metaPixelId}
          ga4MeasurementId={pixels.ga4MeasurementId}
          googleAdsConversionId={pixels.googleAdsConversionId}
        />
        <PublicQuizClient quizId={publicSlug} />
      </>
    );
  }
  // Fire-and-forget view bump — mirrors /p/[popquizId] so analytics
  // stay consistent whether the URL was the prefixed legacy shape or
  // the new clean one.
  void supabaseAdmin.rpc("log_popquiz_event", {
    popquiz_id_input: r.popquiz.id,
    event_type_input: "view",
  });
  // Popquiz hérite du pixel par défaut du créateur (owner = domain owner).
  const pqPixels = await resolveEffectivePixels({}, owner);
  return (
    <>
      <TrackingPixels
        metaPixelId={pqPixels.metaPixelId}
        ga4MeasurementId={pqPixels.ga4MeasurementId}
        googleAdsConversionId={pqPixels.googleAdsConversionId}
      />
      <PopquizPlayClient popquiz={r.popquiz} />
    </>
  );
}
