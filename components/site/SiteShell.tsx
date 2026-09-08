// components/site/SiteShell.tsx
//
// LE CADRE COMMUN DE TOUTES LES PAGES PUBLIQUES.
//
// La classe `tq-site` porte les jetons de couleur du site public
// (globals.css). Elle est posée ICI et à un seul endroit : une page qui
// l'oublierait s'afficherait avec les couleurs de l'app, et on ne le
// verrait qu'en la regardant.

import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import type { LanguePublique } from "@/lib/site/langues";

/**
 * LA LANGUE EST UN PARAMÈTRE OBLIGATOIRE.
 *
 * Elle décide où mènent les liens du chrome : sur une page anglaise,
 * `/tarifs` doit mener à `/en/tarifs`, qui existe. La deviner ici est
 * impossible, et c'est le point : `/en/blog` est PRÉRENDU au build,
 * donc sans requête et sans en-tête à lire, pendant que `/en/tarifs`
 * passe par la réécriture du middleware. Deux chemins, deux façons de
 * connaître la langue, et un seul endroit qui la SAIT : l'appelant.
 *
 * Le compilateur refuse donc un appelant qui se tait (règle du
 * 1er août). Sans ça, un layout ajouté demain servirait le chrome
 * français sur une page anglaise, et ça ne se verrait pas : la page
 * s'affiche parfaitement, seuls les liens ramènent au français.
 */
export default function SiteShell({
  children,
  langue,
}: {
  children: React.ReactNode;
  langue: LanguePublique;
}) {
  return (
    <div className="tq-site flex min-h-screen flex-col">
      <SiteHeader langue={langue} />
      <div className="flex-1">{children}</div>
      <SiteFooter langue={langue} />
    </div>
  );
}
