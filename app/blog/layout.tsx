// app/blog/layout.tsx
//
// LE BLOG PORTE LE CADRE DU SITE PUBLIC.
//
// Avant le 30 août, il avait son propre en-tête et son propre pied de
// page, plus courts que ceux du reste du site. Deux chromes pour un
// seul site, c'est deux endroits où ajouter chaque nouvelle page, donc
// un des deux qui prend du retard. Ils vivent maintenant dans
// `components/site/`, et le blog les utilise comme les autres pages.

// LA LANGUE EST ÉCRITE EN DUR, ET C'EST OBLIGATOIRE ICI.
//
// Ces pages sont `force-static` : elles sont prérendues au BUILD, donc
// il n'y a AUCUNE requête à interroger, donc aucun en-tête de langue à
// lire. Et il n'y en a pas besoin : ce segment sert le blog français, le
// blog anglais a le sien (`app/en/blog/`).

import SiteShell from "@/components/site/SiteShell";
import { LANGUE_SANS_PREFIXE } from "@/lib/site/langues";

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <SiteShell langue={LANGUE_SANS_PREFIXE}>{children}</SiteShell>;
}
