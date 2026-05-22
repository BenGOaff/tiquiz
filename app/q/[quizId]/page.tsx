// app/q/[quizId]/page.tsx
// Public quiz page (no auth required).
// The "[quizId]" URL segment accepts either the quiz UUID or a custom slug.
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import PublicQuizClient from "@/components/quiz/PublicQuizClient";
import QuizJsonLd from "@/components/quiz/QuizJsonLd";
import { stripHtml } from "@/lib/richText";
import { buildCanonicalUrl, fetchOwnerBranding } from "@/lib/publicUrl";

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
      .select("id, user_id, slug, title, introduction, og_image_url, og_description, seo_noindex")
      .eq("id", slugOrId)
      .eq("status", "active")
      .maybeSingle();
    if (data) return data;
  }
  const { data } = await supabaseAdmin
    .from("quizzes")
    .select("id, user_id, slug, title, introduction, og_image_url, og_description, seo_noindex")
    .ilike("slug", slugOrId)
    .eq("status", "active")
    .maybeSingle();
  return data;
}

// Note : la résolution du custom domain + share_site_name de l'owner
// vit dans `fetchOwnerBranding` (lib/publicUrl.ts) — partagé entre les
// 3 routes publiques pour rester cohérent.

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { quizId } = await params;
  try {
    const data = await fetchQuizMeta(quizId);
    if (!data) return { title: "Quiz" };

    // Custom-domain ownership: when serving through a creator's branded
    // hostname, the loaded quiz must belong to them. Mismatch = 404 so
    // we never serve another creator's quiz through someone else's
    // domain (phishing / impersonation protection).
    const customOwner = await resolveCustomDomainOwner();
    if (customOwner && data.user_id !== customOwner) {
      return { title: "Quiz" };
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

    // Branding owner : custom domain vérifié + share_site_name (optionnel).
    // Permet de virer toute trace de "Tiquiz" des meta sociales quand
    // l'user a payé pour un domain brandé.
    const customHost = (await headers()).get(CUSTOM_HOST_HEADER);
    const branding = data.user_id
      ? await fetchOwnerBranding(String(data.user_id), customHost)
      : null;
    const ownerSlug = (data as { slug?: string | null }).slug?.trim() ?? "";

    // Canonical = brand URL si custom domain ; sinon URL réelle de la requête.
    const canonical = branding && ownerSlug
      ? `https://${branding.customHost}/${ownerSlug}`
      : await buildCanonicalUrl(`/q/${quizId}`);

    // site_name affiché par iMessage / WhatsApp / FB sous l'aperçu.
    // Sur main host : "Tiquiz" (via le template layout, comportement
    // historique). Sur custom domain : share_site_name si rempli sinon
    // le hostname brandé. Plus aucun "Tiquiz" qui leak.
    const siteName = branding ? (branding.siteName || branding.customHost) : null;

    // Title : sur custom domain on construit un `absolute` qui shunte
    // le template global `%s · Tiquiz` de app/layout.tsx. Sur main host
    // on retourne juste plainTitle et le template ajoute "· Tiquiz".
    const titleOverride = siteName
      ? { absolute: `${plainTitle} · ${siteName}` }
      : plainTitle;

    // Respecte le toggle "masquer aux moteurs de recherche" côté éditeur.
    // Quand activé, on émet `<meta name="robots" content="noindex,nofollow">`
    // et la row est exclue du sitemap.xml + llms.txt.
    const robotsMeta = (data as { seo_noindex?: boolean }).seo_noindex
      ? { robots: { index: false, follow: false, googleBot: { index: false, follow: false } } }
      : {};

    return {
      title: titleOverride,
      description,
      ...robotsMeta,
      ...(siteName ? { applicationName: siteName } : {}),
      ...(canonical ? { alternates: { canonical } } : {}),
      ...(branding?.faviconUrl
        ? {
            icons: {
              // sizes="any" pour battre le <link sizes="any"> auto-injecté
              // par Next.js depuis app/favicon.ico. Sans cet attribut explicite,
              // Firefox préfère le link avec sizes (= favicon Tiquiz) au nôtre.
              // Cf. CLAUDE_PITFALLS.md section O.
              icon: [{ url: branding.faviconUrl, sizes: "any" }],
              shortcut: branding.faviconUrl,
              apple: branding.faviconUrl,
            },
          }
        : {}),
      openGraph: {
        title: plainTitle,
        description,
        ...(siteName ? { siteName } : {}),
        ...(canonical ? { url: canonical } : {}),
        ...(data.og_image_url ? { images: [{ url: data.og_image_url }] } : {}),
      },
      // Override des twitter:* aussi sinon le layout global laisse
      // « Tiquiz » dans twitter:title et la description marketing dans
      // twitter:description (Telegram, Slack, Discord lisent souvent
      // twitter:* en priorité).
      twitter: {
        card: "summary_large_image",
        title: plainTitle,
        ...(description ? { description } : {}),
        ...(data.og_image_url ? { images: [data.og_image_url] } : {}),
      },
    };
  } catch {
    return { title: "Quiz" };
  }
}

export default async function PublicQuizPage({ params }: Props) {
  const { quizId } = await params;

  // Same ownership check as in generateMetadata: a custom domain may
  // only render quizzes belonging to its owner. We do it server-side
  // here so a wrong-tenant request short-circuits before the client
  // bundle even loads.
  const customOwner = await resolveCustomDomainOwner();
  const meta = await fetchQuizMeta(quizId);
  if (customOwner) {
    if (!meta || meta.user_id !== customOwner) notFound();
  }

  // ─── JSON-LD pour SEO + indexation IA ─────────────────────────────
  // On lookup le nom de l'auteur côté `profiles` + compte les questions
  // pour enrichir les données structurées. Best-effort : si une query
  // échoue, on render quand même la page (le JSON-LD reste sans ces
  // champs optionnels).
  let authorName: string | null = null;
  let authorUrl: string | null = null;
  let questionCount: number | null = null;
  let createdAt: string | null = null;
  let updatedAt: string | null = null;
  let language: string | null = null;
  if (meta?.user_id) {
    const [profileRes, fullQuizRes] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("brand_website_url, full_name")
        .eq("user_id", meta.user_id)
        .maybeSingle(),
      supabaseAdmin
        .from("quizzes")
        .select("questions, created_at, updated_at, content_locale")
        .eq("id", (meta as { id?: string }).id ?? quizId)
        .maybeSingle(),
    ]);
    const profile = profileRes.data as
      | { brand_website_url?: string | null; full_name?: string | null }
      | null;
    authorName = profile?.full_name ?? null;
    authorUrl = profile?.brand_website_url ?? null;
    const q = fullQuizRes.data as
      | { questions?: unknown[]; created_at?: string; updated_at?: string; content_locale?: string }
      | null;
    if (Array.isArray(q?.questions)) questionCount = q!.questions.length;
    createdAt = q?.created_at ?? null;
    updatedAt = q?.updated_at ?? null;
    language = q?.content_locale ?? null;
  }

  const canonical = (await buildCanonicalUrl(`/q/${quizId}`)) ?? "";

  return (
    <>
      {meta && canonical && (
        <QuizJsonLd
          canonicalUrl={canonical}
          title={meta.title}
          description={meta.og_description || meta.introduction || null}
          imageUrl={meta.og_image_url || null}
          createdAt={createdAt}
          updatedAt={updatedAt}
          authorName={authorName}
          authorUrl={authorUrl}
          numberOfQuestions={questionCount}
          inLanguage={language}
        />
      )}
      <PublicQuizClient quizId={quizId} />
    </>
  );
}
