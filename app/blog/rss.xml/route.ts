// app/blog/rss.xml/route.ts
//
// LE FLUX DU BLOG, SERVI.
//
// Le nom du dossier porte l'extension exprès : l'adresse doit être
// `/blog/rss.xml` et pas `/blog/rss`. Un flux se colle dans un outil qui
// attend un fichier, et beaucoup refusent une adresse sans extension.
//
// `force-static` + `revalidate` : le contenu vient de fichiers du dépôt,
// donc il ne change qu'au déploiement. Recalculer ce flux à chaque
// requête ferait travailler le serveur pour rendre exactement le même
// XML, et une automatisation le demande toutes les quinze minutes.
//
// AUCUNE BASE N'EST TOUCHÉE, et c'est délibéré : le blog s'affiche sans
// Supabase (leçon du 30 août, où un `import` de `supabaseAdmin` faisait
// répondre 500 à toute la page d'article). Un flux qui tombe le jour
// d'une panne de base serait un flux sur lequel on ne peut pas compter.

import { listerArticles } from "@/lib/blog/articles";
import { construireFlux } from "@/lib/blog/flux";

export const dynamic = "force-static";
export const revalidate = 3600;

export function GET(): Response {
  return new Response(construireFlux(listerArticles()), {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
