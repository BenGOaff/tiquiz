// app/(site-langues)/layout.tsx
//
// LE CADRE DES PAGES PUBLIQUES QUI EXISTENT EN PLUSIEURS LANGUES.
//
// Un deuxième groupe de routes, donc AUCUN segment d'URL en plus :
// `/tarifs` reste `/tarifs`, et `/en/tarifs` reste réécrit vers lui.
//
// -- POURQUOI IL EST SÉPARÉ DE `(site)` -------------------------------
//
// Le chrome doit connaître la langue de l'ADRESSE pour que ses liens
// suivent (`hrefPourLangue`) : sur `/en/tarifs`, "Blog" doit mener à
// `/en/blog` et pas au blog français. Cette langue se lit dans l'en-tête
// posé par le middleware, donc par `headers()`, donc le groupe devient
// DYNAMIQUE.
//
// Poser cette lecture dans `app/(site)/layout.tsx` aurait rendu
// dynamiques les 9 pages du groupe, dont 8 sont prérendues au build
// aujourd'hui et n'ont aucune version anglaise : on aurait payé un rendu
// par requête sur les pages qui rankent, pour rien. `/tarifs`, lui, lit
// déjà l'en-tête dans sa propre `generateMetadata` : ce groupe ne coûte
// donc RIEN de plus.
//
// Les deux layouts rendent le MÊME `SiteShell` : le menu, le pied de
// page et leurs libellés vivent à un seul endroit
// (`lib/site/nav.ts`), il n'y a pas deux chromes à tenir d'accord.
// `tests/logic/site-en-anglais.test.mts` exige que tout appelant de
// `SiteShell` passe sa langue.

import SiteShell from "@/components/site/SiteShell";
import { langueCanonique } from "@/lib/site/langueRequete";

export default async function SiteLangueLayout({ children }: { children: React.ReactNode }) {
  return <SiteShell langue={await langueCanonique()}>{children}</SiteShell>;
}
