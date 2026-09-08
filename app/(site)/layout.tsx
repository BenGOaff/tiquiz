// app/(site)/layout.tsx
//
// LE CADRE DES PAGES PUBLIQUES DE tiquiz.fr, EN FRANÇAIS.
//
// Un groupe de routes (les parenthèses) : il donne un cadre commun sans
// ajouter de segment dans l'URL. `/affiliation` reste `/affiliation`.
//
// -- POURQUOI LA LANGUE EST ÉCRITE EN DUR ICI -------------------------
//
// Aucune de ces pages n'a de version anglaise (`lib/site/
// pagesPubliques.ts` : seule `/tarifs` déclare `langues: ["fr","en"]`,
// et elle vit dans `app/(site-langues)/`). Le middleware ne réécrit donc
// jamais `/en/<un de ces chemins>` : la question ne se pose pas.
//
// Et lire l'en-tête de langue ici COÛTERAIT quelque chose de mesurable :
// un `headers()` dans un layout rend TOUT le groupe dynamique. Relevé le
// 8 septembre, 8 de ces 9 pages sont prérendues au build aujourd'hui
// (aucune n'appelle une API dynamique), et ce sont exactement celles qui
// commencent à ranker. On ne les convertit pas en rendu par requête pour
// une langue qu'elles n'ont pas.

import SiteShell from "@/components/site/SiteShell";
import { LANGUE_SANS_PREFIXE } from "@/lib/site/langues";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <SiteShell langue={LANGUE_SANS_PREFIXE}>{children}</SiteShell>;
}
