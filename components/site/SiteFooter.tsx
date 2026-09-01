// components/site/SiteFooter.tsx
//
// LE PIED DE PAGE, QUI EST AUSSI LE PLAN DU SITE.
//
// Il porte TOUT, y compris ce que le menu ne montre pas : c'est ce
// qu'un moteur suit pour découvrir les pages, et ce qu'un visiteur
// perdu finit par regarder. Ses liens viennent de `lib/site/nav.ts`,
// jamais recopiés ici : une page ajoutée au menu et oubliée dans le
// pied serait une page que personne ne trouve.

import Link from "next/link";
import { PIED, attributsLien, estLienExterne } from "@/lib/site/nav";

export default function SiteFooter() {
  const annee = new Date().getFullYear();
  return (
    <footer className="tq-pied mt-24">
      <div className="tq-large py-16">
        {/* LA MARQUE À GAUCHE, LES COLONNES DE LIENS DANS LEUR PROPRE GRILLE.
            Une seule grille pour tout obligeait à recompter les colonnes à
            chaque page ajoutée au pied : la 5e colonne (Intégrations) aurait
            écrasé les autres. Ici les colonnes de liens passent à la ligne
            toutes seules. */}
        <div className="grid gap-x-10 gap-y-12 lg:grid-cols-[minmax(0,1fr)_3fr]">
          <div>
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-tiquiz.webp" alt="Tiquiz" width={360} height={186} className="h-8 w-auto" />
            </div>
            <p className="mt-3 max-w-[24ch] text-sm leading-relaxed text-[#8d9ab8]">
              Des quiz qui captent des leads déjà qualifiés, et les taguent tout seuls dans
              Systeme.io.
            </p>
          </div>

          <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {PIED.map((colonne) => (
              <div key={colonne.titre}>
                <p className="tq-pied-titre">{colonne.titre}</p>
                <ul className="mt-4 space-y-2.5">
                  {colonne.liens.map((l) => (
                    <li key={l.href}>
                      {estLienExterne(l.href) ? (
                        <a href={l.href} className="text-sm" {...attributsLien(l.href)}>
                          {l.libelle}
                        </a>
                      ) : (
                        <Link href={l.href} className="text-sm" {...attributsLien(l.href)}>
                          {l.libelle}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-[#7f8db0] sm:flex-row sm:items-center sm:justify-between">
          <p>© {annee} Ethilife. Tiquiz et l&apos;Atelier du Quiz sont des marques d&apos;Ethilife.</p>
          <p>Fait en France, par une créatrice qui vend avec ses propres quiz.</p>
        </div>
      </div>
    </footer>
  );
}
