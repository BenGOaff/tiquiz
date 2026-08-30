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

export default function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="tq-site flex min-h-screen flex-col">
      <SiteHeader />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
