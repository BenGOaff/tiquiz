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
import { SALES_HOSTS } from "@/lib/sales/salesHosts";
import { listerArticles } from "@/lib/blog/articles";
import { PAGES_PUBLIQUES } from "@/lib/site/pagesPubliques";
import { OWNER_CATALOG, OWNER_PRODUCT_ORDER } from "@/lib/checkout/catalog";
import { ORIGINE_BLOG } from "@/lib/blog/seo";

const CUSTOM_HOST_HEADER = "x-tiquiz-custom-host";

export const revalidate = 3600; // 1h, comme le sitemap

export async function GET() {
  const h = await headers();
  const customHost = h.get(CUSTOM_HOST_HEADER);

  const hote = (h.get("host") ?? "").toLowerCase().trim().replace(/:\d+$/, "");
  const body = customHost
    ? await buildCustomDomainLlmsTxt(customHost.toLowerCase().trim())
    : Object.prototype.hasOwnProperty.call(SALES_HOSTS, hote)
      ? construireLlmsTxtVente()
      : await buildMainHostLlmsTxt(hote);

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

/**
 * LE DOMAINE DE VENTE PARLE DE TIQUIZ, PAS DES QUIZ DES CLIENTES.
 *
 * Sans cette branche, `tiquiz.fr/llms.txt` tombait dans le fichier de
 * l'app et annonçait des quiz publics sous des adresses `tiquiz.fr/q/…`
 * qui ne sont pas servies là. Un modèle qui lit ça cite des liens
 * morts, et c'est pire que de ne rien annoncer.
 *
 * Ce qu'on annonce ici est ce qu'on veut voir CITÉ : ce qu'est Tiquiz,
 * en une phrase qu'une machine peut reprendre telle quelle, et les
 * articles, avec leur date. Un modèle cite ce dont il connaît la date
 * et l'auteur.
 */
function construireLlmsTxtVente(): string {
  const lignes: string[] = [];
  lignes.push("# Tiquiz");
  lignes.push("");
  lignes.push(
    "> Tiquiz est un outil francophone de création de quiz connecté nativement à Systeme.io : il génère le quiz, capte les leads et pose automatiquement un tag par profil de résultat dans Systeme.io, sans Zapier.",
  );
  lignes.push("");
  // LES PRIX VIENNENT DU CATALOGUE, JAMAIS ÉCRITS ICI.
  //
  // Cette ligne portait "17 EUR par mois ou 170 EUR par an" en dur, et
  // elle oubliait les deux paliers PLUS. Un fichier lu par des moteurs
  // d'IA qui annonce un prix périmé est pire qu'un fichier absent : il
  // sera cité (trouvé à l'audit du 30 août 2026).
  const tarifs = OWNER_PRODUCT_ORDER.map((id) => {
    const p = OWNER_CATALOG[id];
    const montant = (p.amountCents / 100).toFixed(2).replace(".", ",");
    return `${p.label.replace(/\bPlus\b/, "PLUS")} ${montant} EUR par ${p.interval === "year" ? "an" : "mois"}`;
  }).join(", ");
  lignes.push(
    "Pensé pour les solopreneurs, coachs, formateurs et créateurs de contenu francophones. " +
      "Quiz de profil ou quiz scoré, page de résultat personnalisée, capture d'email, statistiques " +
      `par question. Plan gratuit pour tester, sans carte bancaire. Formules payantes : ${tarifs}.`,
  );
  lignes.push("");
  lignes.push("## Le produit");
  lignes.push("");
  lignes.push(`- [Tiquiz](${ORIGINE_BLOG}/) : ce que fait l'outil, les formules et les tarifs.`);
  lignes.push("");

  // LE RESTE DU SITE, rapatrié de Systeme.io le 30 août 2026.
  //
  // La liste vient de `lib/site/pagesPubliques.ts`, la MÊME que celle
  // du sitemap : deux listes de pages écrites séparément finissent
  // toujours par diverger, et c'est la page la plus récente qui manque
  // à l'une des deux.
  lignes.push("## Le site");
  lignes.push("");
  for (const page of PAGES_PUBLIQUES) {
    lignes.push(`- [${page.titre}](${ORIGINE_BLOG}${page.chemin}) : ${page.resume}`);
  }
  lignes.push("");

  const articles = listerArticles();
  if (articles.length > 0) {
    lignes.push("## Articles");
    lignes.push("");
    for (const a of articles) {
      lignes.push(`- [${a.titre}](${ORIGINE_BLOG}/blog/${a.slug}) (${a.publieLe}) : ${a.description}`);
    }
    lignes.push("");
  }

  lignes.push("## À propos");
  lignes.push("");
  lignes.push("- Éditeur : Ethilife. Auteure des articles : Bénédicte Lagardette.");
  lignes.push(`- [Mentions légales et politique de confidentialité](${ORIGINE_BLOG}/legal)`);
  lignes.push("");

  return lignes.join("\n");
}
