// app/q/[quizId]/page.tsx
// Public quiz page (no auth required).
// The "[quizId]" URL segment accepts either the quiz UUID or a custom slug.
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import PublicQuizClient from "@/components/quiz/PublicQuizClient";
import { stripHtml } from "@/lib/richText";
import { buildCanonicalUrl } from "@/lib/publicUrl";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ quizId: string }> };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Header set by middleware when the request arrived through a creator
// custom domain. When present, the resolved quiz MUST belong to that
// domain's owner — without this check, anyone who connects their own
// domain could serve someone else's quizzes through it (e.g. phishing).
const CUSTOM_HOST_HEADER = "x-tiquiz-custom-host";

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

async function fetchQuizMeta(slugOrId: string) {
  if (UUID_RE.test(slugOrId)) {
    const { data } = await supabaseAdmin
      .from("quizzes")
      .select("user_id, slug, title, introduction, og_image_url, og_description")
      .eq("id", slugOrId)
      .eq("status", "active")
      .maybeSingle();
    if (data) return data;
  }
  const { data } = await supabaseAdmin
    .from("quizzes")
    .select("user_id, slug, title, introduction, og_image_url, og_description")
    .ilike("slug", slugOrId)
    .eq("status", "active")
    .maybeSingle();
  return data;
}

// Resolve the owner's preferred public hostname so og:url + canonical
// point to their custom domain (when verified) regardless of which URL
// the creator actually shared. Without this, sharing a `quiz.tipote.com`
// URL would leave the iMessage / WhatsApp preview showing tipote in the
// hostname slot even when the owner has paid for a branded domain
// (Adeline 19 mai 2026).
async function fetchOwnerCustomHost(userId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("custom_domains")
    .select("hostname")
    .eq("user_id", userId)
    .eq("status", "verified")
    .order("verified_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const h = (data as { hostname?: string | null } | null)?.hostname;
  return h ? h.toLowerCase().trim() : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { quizId } = await params;
  try {
    const data = await fetchQuizMeta(quizId);
    if (!data) return { title: "Quiz – Tiquiz" };

    // Custom-domain ownership: when serving through a creator's branded
    // hostname, the loaded quiz must belong to them. Mismatch = 404 so
    // we never serve another creator's quiz through someone else's
    // domain (phishing / impersonation protection).
    const customOwner = await resolveCustomDomainOwner();
    if (customOwner && data.user_id !== customOwner) {
      return { title: "Quiz – Tiquiz" };
    }

    // Description OG : le titre ET l'introduction sont éditables en
    // rich-text → on strip avant de truncate (sinon les 160 premiers
    // chars de l'intro peuvent être bourrés de balises HTML brutes ou
    // d'entités `&nbsp;` qui apparaissent en clair dans l'aperçu de
    // partage iMessage / WhatsApp). Cf. rapport Adeline (16 mai 2026).
    const ogDescRaw = stripHtml(data.og_description);
    const introPlain = stripHtml(data.introduction);
    const rawDesc = ogDescRaw || introPlain.slice(0, 160);
    const description = rawDesc.trim() || undefined;
    const plainTitle = stripHtml(data.title);

    // Canonical = the owner's branded URL when they have a verified
    // custom domain ; otherwise the actual request URL. This decouples
    // "which URL was shared" from "what hostname iMessage shows under
    // the preview" — a creator who shared `quiz.tipote.com/q/abc` from
    // their dashboard still gets `monsite.fr/abc` in the preview if
    // their domain is verified. Falls back to buildCanonicalUrl(host)
    // when no custom domain exists.
    const ownerHost = data.user_id ? await fetchOwnerCustomHost(String(data.user_id)) : null;
    const ownerSlug = (data as { slug?: string | null }).slug?.trim() ?? "";
    const canonical = ownerHost && ownerSlug
      ? `https://${ownerHost}/${ownerSlug}`
      : await buildCanonicalUrl(`/q/${quizId}`);

    return {
      title: `${plainTitle} – Tiquiz`,
      description,
      ...(canonical ? { alternates: { canonical } } : {}),
      openGraph: {
        title: plainTitle,
        description,
        ...(canonical ? { url: canonical } : {}),
        ...(data.og_image_url ? { images: [{ url: data.og_image_url }] } : {}),
      },
    };
  } catch {
    return { title: "Quiz – Tiquiz" };
  }
}

export default async function PublicQuizPage({ params }: Props) {
  const { quizId } = await params;

  // Same ownership check as in generateMetadata: a custom domain may
  // only render quizzes belonging to its owner. We do it server-side
  // here so a wrong-tenant request short-circuits before the client
  // bundle even loads.
  const customOwner = await resolveCustomDomainOwner();
  if (customOwner) {
    const data = await fetchQuizMeta(quizId);
    if (!data || data.user_id !== customOwner) notFound();
  }

  return <PublicQuizClient quizId={quizId} />;
}
