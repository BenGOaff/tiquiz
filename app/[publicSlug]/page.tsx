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
import { isReservedPublicSlug } from "@/lib/publicSlug";
import { stripHtml } from "@/lib/richText";
import { buildCanonicalUrl, fetchOwnerBranding } from "@/lib/publicUrl";

export const dynamic = "force-dynamic";

const CUSTOM_HOST_HEADER = "x-tiquiz-custom-host";

type Props = { params: Promise<{ publicSlug: string }> };

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
  | { kind: "quiz"; meta: { title?: string | null; introduction?: string | null; og_image_url?: string | null; og_description?: string | null } }
  | { kind: "popquiz"; popquiz: ResolvedPopquiz }
  | null;

// Single resolver used by both generateMetadata and the page body so
// we don't hit the DB twice per request.
async function resolve(slug: string, ownerId: string): Promise<Resolved> {
  const { data: quiz } = await supabaseAdmin
    .from("quizzes")
    .select("title, introduction, og_image_url, og_description")
    .eq("user_id", ownerId)
    .ilike("slug", slug)
    .eq("status", "active")
    .maybeSingle();
  if (quiz) return { kind: "quiz", meta: quiz };

  // Popquiz path: owner-gate first (cheap), then fetch the full object
  // only if it belongs to this domain's owner. fetchPublishedPopquiz
  // does not expose user_id on the returned shape, hence the split.
  const { data: pqOwner } = await supabaseAdmin
    .from("popquizzes")
    .select("id")
    .eq("user_id", ownerId)
    .ilike("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (!pqOwner) return null;

  const popquiz = await fetchPublishedPopquiz(slug);
  if (!popquiz) return null;
  return { kind: "popquiz", popquiz };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { publicSlug } = await params;
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
    const introPlain = stripHtml(r.meta.introduction);
    const description = (ogDescRaw || introPlain.slice(0, 160)).trim() || undefined;
    const titleOverride = siteName
      ? { absolute: `${plainTitle || "Quiz"} · ${siteName}` }
      : (plainTitle || "Quiz");
    return {
      title: titleOverride,
      description,
      ...(siteName ? { applicationName: siteName } : {}),
      ...(branding?.faviconUrl ? { icons: { icon: branding.faviconUrl, shortcut: branding.faviconUrl, apple: branding.faviconUrl } } : {}),
      ...(canonical ? { alternates: { canonical } } : {}),
      openGraph: {
        title: plainTitle || "Quiz",
        description,
        ...(siteName ? { siteName } : {}),
        ...(canonical ? { url: canonical } : {}),
        ...(r.meta.og_image_url
          ? { images: [{ url: r.meta.og_image_url }] }
          : {}),
      },
      twitter: {
        card: "summary_large_image",
        title: plainTitle || "Quiz",
        ...(description ? { description } : {}),
        ...(r.meta.og_image_url ? { images: [r.meta.og_image_url] } : {}),
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
    return <PublicQuizClient quizId={publicSlug} />;
  }
  // Fire-and-forget view bump — mirrors /p/[popquizId] so analytics
  // stay consistent whether the URL was the prefixed legacy shape or
  // the new clean one.
  void supabaseAdmin.rpc("log_popquiz_event", {
    popquiz_id_input: r.popquiz.id,
    event_type_input: "view",
  });
  return <PopquizPlayClient popquiz={r.popquiz} />;
}
