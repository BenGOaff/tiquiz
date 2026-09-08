// app/en/blog/rss.xml/route.ts
//
// LE FLUX DU BLOG ANGLAIS.
//
// Il existe pour la meme raison que `app/en/blog/page.tsx` : `/en/blog`
// est EXCLU de la reecriture du middleware
// (`lib/site/langues.ts`, `CHEMINS_HORS_REECRITURE`), donc c'est ce
// fichier qui repond.
//
// -- POURQUOI UN FLUX PAR LANGUE, ET PAS UN SEUL --------------------
//
// Un flux porte SA langue (`<language>`), SES liens d'article et SON
// titre de canal. Servir les articles anglais dans le flux francais
// donnerait `fr-FR` au dessus de quatre adresses anglaises, et l'inverse
// enverrait une automatisation publier du francais sur un compte
// anglais. Aucune des deux erreurs ne produit la moindre ligne rouge :
// le flux reste valide, et il dit juste autre chose que ce qu'il
// annonce.
//
// AUCUNE BASE N'EST TOUCHEE, comme le flux francais : le blog s'affiche
// sans Supabase, et un flux qui tombe le jour d'une panne de base est un
// flux sur lequel on ne peut pas compter.

import { listerArticles } from "@/lib/blog/articles";
import { construireFlux } from "@/lib/blog/flux";

export const dynamic = "force-static";
export const revalidate = 3600;

export function GET(): Response {
  return new Response(construireFlux(listerArticles("en"), "en"), {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
