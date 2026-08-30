// app/blog/layout.tsx
//
// LE BLOG PORTE LE CADRE DU SITE PUBLIC.
//
// Avant le 30 août, il avait son propre en-tête et son propre pied de
// page, plus courts que ceux du reste du site. Deux chromes pour un
// seul site, c'est deux endroits où ajouter chaque nouvelle page, donc
// un des deux qui prend du retard. Ils vivent maintenant dans
// `components/site/`, et le blog les utilise comme les autres pages.

import SiteShell from "@/components/site/SiteShell";

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <SiteShell>{children}</SiteShell>;
}
