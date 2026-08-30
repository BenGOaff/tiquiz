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
import { MENU, CTA_MENU, attributsLien } from "@/lib/site/nav";

function Marque() {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="Tiquiz, accueil">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/favicon-tiquiz.png" alt="" width={28} height={28} className="rounded-md" />
      <span className="text-[1.05rem] font-extrabold tracking-tight">tiquiz</span>
    </Link>
  );
}

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--tq-bord)] bg-[var(--tq-creme)]/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
        <Marque />

        <nav aria-label="Navigation principale" className="hidden items-center gap-7 md:flex">
          {MENU.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-[var(--tq-encre-douce)] transition-colors hover:text-[var(--tq-encre)]"
              {...attributsLien(l.href)}
            >
              {l.libelle}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            className="text-sm font-medium text-[var(--tq-encre-douce)] transition-colors hover:text-[var(--tq-encre)]"
          >
            Se connecter
          </Link>
          <Link href={CTA_MENU.href} className="tq-bouton !px-4 !py-2 !text-sm">
            {CTA_MENU.libelle}
          </Link>
        </div>

        {/* Le menu mobile. `group` + `open:` suffisent : pas d'état React. */}
        <details className="group relative md:hidden">
          <summary
            className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-lg border border-[var(--tq-bord)]"
            aria-label="Ouvrir le menu"
          >
            <span aria-hidden className="text-lg leading-none">
              ≡
            </span>
          </summary>
          <div className="absolute right-0 top-11 w-60 rounded-xl border border-[var(--tq-bord)] bg-white p-2 shadow-lg">
            {MENU.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="block rounded-lg px-3 py-2 text-sm font-medium hover:bg-[var(--tq-panneau)]"
                {...attributsLien(l.href)}
              >
                {l.libelle}
              </Link>
            ))}
            <div className="my-1 border-t border-[var(--tq-bord)]" />
            <Link
              href="/login"
              className="block rounded-lg px-3 py-2 text-sm font-medium hover:bg-[var(--tq-panneau)]"
            >
              Se connecter
            </Link>
            <Link
              href={CTA_MENU.href}
              className="mt-1 block rounded-lg bg-[var(--tq-bleu)] px-3 py-2 text-center text-sm font-semibold text-white"
            >
              {CTA_MENU.libelle}
            </Link>
          </div>
        </details>
      </div>
    </header>
  );
}
