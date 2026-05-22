import type { MetadataRoute } from "next";
import { SUPPORTED_LOCALES } from "@/i18n/config";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const PUBLIC_ROUTES = [
  "",
  "/login",
  "/signup",
  "/privacy",
  "/legal",
  "/terms",
  "/terms-of-use",
  "/cookies",
  "/affiliate",
];

/** Indique à Next que le sitemap est dynamique et doit être régénéré
 *  régulièrement. Sans ça, Next pourrait le bake en SSG au build et
 *  les nouveaux quiz ne seraient indexés qu'au prochain deploy. */
export const revalidate = 3600; // 1h

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://tiquiz.com").replace(/\/$/, "");

  // ─── Pages statiques (landing, légales) ──────────────────────────
  const staticEntries: MetadataRoute.Sitemap = PUBLIC_ROUTES.map((route) => {
    const url = `${base}${route || "/"}`;
    const languages: Record<string, string> = {};
    for (const locale of SUPPORTED_LOCALES) {
      languages[locale] = url;
    }
    languages["x-default"] = url;
    return {
      url,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: route === "" ? 1 : 0.6,
      alternates: { languages },
    };
  });

  // ─── Quiz publics indexables (Omar, 21 mai 2026) ─────────────────
  // Le sitemap d'origine ne listait QUE les pages de l'app — aucun quiz
  // user n'était découvrable par Google sauf via backlinks. On expose
  // maintenant tous les quiz publiés avec un slug ou un id stable.
  //
  // Cap à 10000 pour rester sous la limite par-sitemap de Google
  // (50000 entries, 50 MB). À 10000 quiz/sitemap on a 5× de marge.
  let quizEntries: MetadataRoute.Sitemap = [];
  try {
    const { data: quizzes } = await supabaseAdmin
      .from("quizzes")
      .select("id, slug, updated_at, status")
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(10000);

    if (Array.isArray(quizzes)) {
      quizEntries = (quizzes as Array<{ id: string; slug: string | null; updated_at: string }>).map((q) => {
        // URL canonique : si un slug existe, on l'utilise (URL propre),
        // sinon on retombe sur /q/<id>. Côté custom domain, les visiteurs
        // accèdent au quiz via /<slug> — pour le sitemap du host principal,
        // on garde /q/<id-ou-slug> qui marche dans tous les cas.
        const pathSegment = q.slug || q.id;
        return {
          url: `${base}/q/${pathSegment}`,
          lastModified: new Date(q.updated_at),
          changeFrequency: "weekly" as const,
          priority: 0.8,
        };
      });
    }
  } catch (err) {
    // Si Supabase tombe au build du sitemap, on continue sans les quiz
    // plutôt que de renvoyer une 500 (cas où Google retry indéfiniment).
    console.warn("[sitemap] failed to fetch quizzes, returning static only", err);
  }

  return [...staticEntries, ...quizEntries];
}
