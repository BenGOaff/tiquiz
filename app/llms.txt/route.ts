// app/llms.txt/route.ts
//
// llms.txt — standard émergent (proposé par Jeremy Howard, sept. 2024)
// pour informer les crawlers LLM (ChatGPT, Perplexity, Claude search,
// Bing AI) du contenu accessible sur le site, dans un format markdown
// optimisé pour leur compréhension.
//
// Différent de robots.txt (qui dit "où tu peux PAS aller") : llms.txt
// dit "voilà ce qui est utile à lire chez moi, organisé par catégorie".
//
// Spec : https://llmstxt.org
//
// Host-aware comme sitemap.xml :
//   - host principal (l'app) : liste les quiz les plus populaires
//     + une description de la plateforme
//   - custom domain user : liste UNIQUEMENT les quiz de ce user, avec
//     leur description, langue, et URL. Permet à un LLM qui crawle le
//     domaine de l'user de comprendre exactement quels quiz existent
//     et pouvoir les recommander dans ses réponses.

import { headers } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { stripHtml } from "@/lib/richText";
import { resolvePublicUrl } from "@/lib/authLinks";
import { hoteCanonique } from "@/lib/publicHost";

const CUSTOM_HOST_HEADER = "x-tiquiz-custom-host";

export const revalidate = 3600; // 1h, comme le sitemap

export async function GET() {
  const h = await headers();
  const customHost = h.get(CUSTOM_HOST_HEADER);

  const body = customHost
    ? await buildCustomDomainLlmsTxt(customHost.toLowerCase().trim())
    : await buildMainHostLlmsTxt((h.get("host") ?? "").toLowerCase().trim());

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}

async function buildCustomDomainLlmsTxt(host: string): Promise<string> {
  const { data: cd } = await supabaseAdmin
    .from("custom_domains")
    .select("user_id")
    .ilike("hostname", host)
    .eq("status", "verified")
    .maybeSingle();
  const userId = (cd as { user_id?: string } | null)?.user_id;
  if (!userId) {
    return `# ${host}\n\nNo content available for this domain.\n`;
  }

  const [profileRes, quizzesRes] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("full_name, brand_website_url, target_audience")
      .eq("user_id", userId)
      .maybeSingle(),
    supabaseAdmin
      .from("quizzes")
      .select("slug, id, title, og_description, introduction, content_locale, updated_at")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(100),
  ]);

  const profile = profileRes.data as
    | { full_name?: string | null; brand_website_url?: string | null; target_audience?: string | null }
    | null;
  const quizzes = (quizzesRes.data ?? []) as Array<{
    slug: string | null;
    id: string;
    title: string;
    og_description: string | null;
    introduction: string | null;
    content_locale: string | null;
    updated_at: string;
  }>;

  const base = `https://${host}`;
  const authorName = profile?.full_name?.trim();

  const lines: string[] = [];
  lines.push(`# ${authorName || host}`);
  lines.push("");
  if (profile?.target_audience?.trim()) {
    lines.push(`> ${profile.target_audience.trim()}`);
    lines.push("");
  }
  lines.push("Interactive quizzes designed to help visitors discover insights about themselves and engage with the author's expertise.");
  lines.push("");

  if (quizzes.length > 0) {
    lines.push("## Quizzes");
    lines.push("");
    for (const q of quizzes) {
      const title = stripHtml(q.title).trim() || "Untitled";
      const desc = stripHtml(q.og_description || q.introduction || "").slice(0, 200).trim();
      const url = q.slug ? `${base}/${q.slug}` : `${base}/q/${q.id}`;
      lines.push(`- [${title}](${url})${desc ? `: ${desc}` : ""}`);
    }
    lines.push("");
  }

  if (profile?.brand_website_url) {
    lines.push("## Author");
    lines.push("");
    lines.push(`- [${authorName || "Website"}](${profile.brand_website_url})`);
    lines.push("");
  }

  return lines.join("\n");
}

async function buildMainHostLlmsTxt(host: string): Promise<string> {
  const base = resolvePublicUrl(
    process.env.NEXT_PUBLIC_SITE_URL,
    hoteCanonique({ host }),
  );
  const lines: string[] = [];
  lines.push("# Tiquiz");
  lines.push("");
  lines.push("> A platform for creators to build interactive personality quizzes that capture qualified leads.");
  lines.push("");
  lines.push("Tiquiz lets coaches, photographers, educators and content creators design engaging quizzes (Buzzfeed-style or assessment-style), share them on their own domain, and convert visitors into email subscribers and customers.");
  lines.push("");

  // Popular recent quizzes (signal trending content to AI crawlers)
  try {
    const { data } = await supabaseAdmin
      .from("quizzes")
      .select("slug, id, title, og_description, updated_at")
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(50);
    const quizzes = (data ?? []) as Array<{ slug: string | null; id: string; title: string; og_description: string | null }>;
    if (quizzes.length > 0) {
      lines.push("## Featured quizzes");
      lines.push("");
      for (const q of quizzes) {
        const title = stripHtml(q.title).trim() || "Untitled";
        const desc = stripHtml(q.og_description || "").slice(0, 160).trim();
        const url = `${base}/q/${q.slug || q.id}`;
        lines.push(`- [${title}](${url})${desc ? `: ${desc}` : ""}`);
      }
      lines.push("");
    }
  } catch {
    // best-effort
  }

  lines.push("## Resources");
  lines.push("");
  lines.push(`- [Homepage](${base}/)`);
  lines.push(`- [Privacy policy](${base}/privacy)`);
  lines.push(`- [Terms of use](${base}/terms-of-use)`);
  lines.push("");

  return lines.join("\n");
}
