// components/legal/SansObfuscationEmail.tsx
//
// LAISSER UNE ADRESSE EMAIL INTACTE DANS LE HTML SERVI.
//
// Cloudflare "Email Address Obfuscation" (Scrape Shield) remplace toute
// adresse email du HTML SERVI par
// `<span class="__cf_email__">[email protected]</span>` plus un script
// qui la reconstruit. Un lecteur qui n'exécute pas le JavaScript (le
// validateur OAuth de Google, un robot d'indexation, un lecteur d'écran
// en mode dégradé) lit donc une page SANS adresse de contact.
//
// MESURÉ le 2 septembre 2026 sur la production : 4 adresses sur 4
// étaient masquées sur la politique de confidentialité.
//
// Ces deux marqueurs sont la directive OFFICIELLE de Cloudflare pour
// laisser une zone intacte. Ils ne changent rien à l'affichage, et ils
// sont sans effet si l'option est désactivée un jour.
//
// -- POURQUOI IL VIT ICI ET PLUS DANS `LegalPageView` -----------------
//
// Il y était enfermé, donc il ne protégeait que les pages légales. Le
// 8 septembre, une adresse est arrivée dans un ARTICLE de blog (le
// contact de Gwenn, dans le cas client de Jocelyne) : sans ce partage,
// elle serait masquée, et personne ne le verrait depuis le dépôt.
//
// Un garde-fou qui ne protège qu'un endroit ne protège pas le suivant.
//
// Le corps de cette fonction est IDENTIQUE à celui de Tipote et de
// l'Atelier (`components/legal/SansObfuscationEmail.tsx` chez les deux) :
// deux copies d'un même marqueur finiraient par ne plus dire la même
// chose, et ici la divergence coûte une adresse de contact.

import type { ReactNode } from "react";

export default function SansObfuscationEmail({ children }: { children: ReactNode }) {
  return (
    <>
      <span dangerouslySetInnerHTML={{ __html: "<!--email_off-->" }} />
      {children}
      <span dangerouslySetInnerHTML={{ __html: "<!--email_on-->" }} />
    </>
  );
}
