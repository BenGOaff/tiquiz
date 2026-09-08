// components/site/SiteHeader.tsx
//
// L'EN-TÊTE DU SITE PUBLIC.
//
// Il est vu par des gens qui n'ont PAS de compte : ils arrivent d'une
// recherche Google sur un article, ou d'un lien affilié. Il ne porte
// donc rien qui suppose une session. Ce qu'il porte, c'est le chemin
// vers ce qu'on vend, et le chemin vers l'aide.
//
// AUCUN JAVASCRIPT. Le menu mobile est un `<details>` natif : les pages
// du blog sont en `force-static`, et y ajouter un composant client
// enverrait un bundle React à quelqu'un venu lire un article. Un menu
// qui s'ouvre est exactement ce que cette balise fait depuis toujours.

import Link from "next/link";
import {
  MENU,
  CTA_MENU,
  LIEN_CONNEXION,
  CHROME_SITE,
  attributsLien,
  hrefPourLangue,
  libellePourLangue,
} from "@/lib/site/nav";
import type { LanguePublique } from "@/lib/site/langues";

function Marque({ accueil }: { accueil: string }) {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label={accueil}>
      {/* SON VRAI LOGO, celui qu'on voit sur ses 10 vignettes. Avant le
          30 août on affichait le favicon carré à côté du mot "tiquiz"
          écrit en CSS : deux fois la marque, dont une inventée. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-tiquiz.webp" alt="Tiquiz" width={360} height={186} className="h-9 w-auto" />
    </Link>
  );
}

export default function SiteHeader({ langue }: { langue: LanguePublique }) {
  // LA DESTINATION ET LE LIBELLÉ SUIVENT LA MÊME SOURCE, et c'est ce
  // qui les empêche de se contredire : un libellé anglais ne s'affiche
  // que là où la page anglaise existe VRAIMENT (`libellePourLangue`).
  //
  // Un libellé resté français est donc une information, pas un oubli :
  // il dit que la page derrière est française. Traduire les huit
  // entrées d'un coup promettrait de l'anglais derrière chaque clic,
  // alors que `/a-propos`, `/integrations` et `/affiliation` n'ont
  // aucune version anglaise.
  const lien = (href: string) => hrefPourLangue(href, langue);
  const mot = (l: typeof CTA_MENU) => libellePourLangue(l, langue);
  const t = CHROME_SITE[langue];
  return (
        // LE FOND EST OPAQUE, et ce n'est pas un detail de gout.
    //
    // Il etait a 90 % avec un flou : joli sur une page claire, illisible
    // au dessus d'une couverture d'article. Or les dix couvertures de
    // Bene sont en marine sombre, et l'en-tete passe DEVANT elles au
    // defilement : le menu devenait gris pale sur bleu nuit. Mesure de
    // l'ancien contraste sur cette bande : bien en dessous du minimum
    // lisible.
    <header className="sticky top-0 z-40 border-b border-[var(--tq-bord)] bg-[var(--tq-creme)]">
      <div className="tq-large flex items-center justify-between gap-5 py-4">
        <Marque accueil={t.accueil} />

        <nav aria-label={t.navigation} className="hidden items-center gap-6 lg:flex">
          {MENU.map((l) => (
            <Link
              key={l.href}
              href={lien(l.href)}
              className="text-[0.95rem] font-medium text-[var(--tq-encre-douce)] transition-colors hover:text-[var(--tq-encre)]"
              {...attributsLien(l.href)}
            >
              {mot(l)}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-4 lg:flex">
          <Link
            href={LIEN_CONNEXION.href}
            className="text-[0.95rem] font-medium text-[var(--tq-encre-douce)] transition-colors hover:text-[var(--tq-encre)]"
          >
            {mot(LIEN_CONNEXION)}
          </Link>
          <Link href={lien(CTA_MENU.href)} className="tq-bouton !px-4 !py-2 !text-sm">
            {mot(CTA_MENU)}
          </Link>
        </div>

        {/* Le menu mobile. `group` + `open:` suffisent : pas d'état React. */}
        <details className="group relative lg:hidden">
          <summary
            className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-lg border border-[var(--tq-bord)]"
            aria-label={t.ouvrirLeMenu}
          >
            <span aria-hidden className="text-lg leading-none">
              ≡
            </span>
          </summary>
          <div className="absolute right-0 top-11 w-60 rounded-xl border border-[var(--tq-bord)] bg-white p-2 shadow-lg">
            {MENU.map((l) => (
              <Link
                key={l.href}
                href={lien(l.href)}
                className="block rounded-lg px-3 py-2 text-sm font-medium hover:bg-[var(--tq-panneau)]"
                {...attributsLien(l.href)}
              >
                {mot(l)}
              </Link>
            ))}
            <div className="my-1 border-t border-[var(--tq-bord)]" />
            <Link
              href={LIEN_CONNEXION.href}
              className="block rounded-lg px-3 py-2 text-sm font-medium hover:bg-[var(--tq-panneau)]"
            >
              {mot(LIEN_CONNEXION)}
            </Link>
            <Link
              href={lien(CTA_MENU.href)}
              className="mt-1 block rounded-lg bg-[var(--tq-bleu)] px-3 py-2 text-center text-sm font-semibold text-white"
            >
              {mot(CTA_MENU)}
            </Link>
          </div>
        </details>
      </div>
    </header>
  );
}
