// app/(site)/layout.tsx
//
// LE CADRE DES PAGES PUBLIQUES DE tiquiz.fr.
//
// Un groupe de routes (les parenthèses) : il donne un cadre commun sans
// ajouter de segment dans l'URL. `/affiliation` reste `/affiliation`.

import SiteShell from "@/components/site/SiteShell";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <SiteShell>{children}</SiteShell>;
}
