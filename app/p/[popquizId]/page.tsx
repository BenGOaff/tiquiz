// Public play page — no auth required. Loads a published popquiz
// via the service-role client (bypasses RLS), 404s otherwise.
// Accepts either a UUID or the custom slug, mirroring /q/[quizId].
//
// Side-effect: every render bumps `views_count` via the
// log_popquiz_event RPC. Fire-and-forget so the response time
// isn't tied to the analytics write; same overcounting story as
// the existing quiz views (bots count too) which we accept until
// a cookie-based dedup ships.

import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { fetchPublishedPopquiz } from "@/lib/popquiz/repo";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { buildCanonicalUrl, fetchOwnerBranding } from "@/lib/publicUrl";
import PopquizPlayClient from "./PopquizPlayClient";

export const dynamic = "force-dynamic";

const CUSTOM_HOST_HEADER = "x-tiquiz-custom-host";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Props = { params: Promise<{ popquizId: string }> };

// Same ownership pattern as /q/[quizId]: when the request comes through
// a creator's branded hostname, the popquiz must belong to that
// creator. Returns the domain owner's user_id, or null if not on a
// custom domain. Mirrors the /q ownership check.
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

// Lightweight lookup so we can do the ownership check without going
// through fetchPublishedPopquiz (which already runs in PublicPopquizPage
// and we don't want to double-fetch). Returns just user_id.
async function fetchPopquizOwner(slugOrId: string): Promise<string | null> {
  const col = UUID_RE.test(slugOrId) ? "id" : "slug";
  const { data } = await supabaseAdmin
    .from("popquizzes")
    .select("user_id")
    .eq(col, slugOrId)
    .eq("is_published", true)
    .maybeSingle();
  return (data?.user_id as string | undefined) ?? null;
}

// Note : la résolution custom domain + share_site_name de l'owner vit
// dans `fetchOwnerBranding` (lib/publicUrl.ts) — partagé entre les 3
// routes publiques pour rester cohérent.

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { popquizId } = await params;
  const popquiz = await fetchPublishedPopquiz(popquizId);
  if (!popquiz) return { title: "Popquiz" };

  // Block other creators' popquizzes from being served through this
  // domain (phishing / impersonation protection — same rationale as /q).
  const customOwner = await resolveCustomDomainOwner();
  if (customOwner) {
    const ownerId = await fetchPopquizOwner(popquizId);
    if (ownerId && ownerId !== customOwner) return { title: "Popquiz" };
  }

  // Branding owner (custom domain + share_site_name) — null = main host
  // → on garde "Tiquiz" via le template layout (comportement historique).
  const ownerId = await fetchPopquizOwner(popquizId);
  const customHost = (await headers()).get(CUSTOM_HOST_HEADER);
  const branding = ownerId ? await fetchOwnerBranding(ownerId, customHost) : null;
  const popquizSlug = (popquiz as { slug?: string | null }).slug?.trim() ?? "";
  const canonical = branding && popquizSlug
    ? `https://${branding.customHost}/${popquizSlug}`
    : await buildCanonicalUrl(`/p/${popquizId}`);

  const siteName = branding ? (branding.siteName || branding.customHost) : null;
  const titleOverride = siteName
    ? { absolute: `${popquiz.title} · ${siteName}` }
    : popquiz.title;

  return {
    title: titleOverride,
    description: popquiz.description ?? undefined,
    ...(siteName ? { applicationName: siteName } : {}),
    ...(canonical ? { alternates: { canonical } } : {}),
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
    openGraph: {
      title: popquiz.title,
      description: popquiz.description ?? undefined,
      ...(siteName ? { siteName } : {}),
      ...(canonical ? { url: canonical } : {}),
      ...(popquiz.video.thumbnailUrl
        ? { images: [{ url: popquiz.video.thumbnailUrl }] }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: popquiz.title,
      ...(popquiz.description ? { description: popquiz.description } : {}),
      ...(popquiz.video.thumbnailUrl ? { images: [popquiz.video.thumbnailUrl] } : {}),
    },
  };
}

export default async function PublicPopquizPage({ params }: Props) {
  const { popquizId } = await params;
  const popquiz = await fetchPublishedPopquiz(popquizId);
  if (!popquiz) notFound();

  // Custom-domain ownership check (mirrors /q). When served through a
  // creator's branded hostname, the popquiz must belong to them.
  const customOwner = await resolveCustomDomainOwner();
  if (customOwner) {
    const ownerId = await fetchPopquizOwner(popquizId);
    if (!ownerId || ownerId !== customOwner) notFound();
  }

  // Fire-and-forget view bump. Awaiting would tie response time to
  // the analytics write for no good reason; the RPC is idempotent
  // at the row level so a missed call just costs us one undercounted
  // view, not data corruption.
  void supabaseAdmin.rpc("log_popquiz_event", {
    popquiz_id_input: popquiz.id,
    event_type_input: "view",
  });

  return <PopquizPlayClient popquiz={popquiz} />;
}
