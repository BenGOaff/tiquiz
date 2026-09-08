// components/site/PastillesRubriques.tsx
//
// LES PASTILLES DE RUBRIQUE.
//
// Ce sont des LIENS, pas des boutons : chaque rubrique a une adresse,
// donc elle s'indexe, se partage et fonctionne sans JavaScript. Un
// filtre en JavaScript aurait la même allure et ne créerait aucune
// page.

import Link from "next/link";
import { rubriquesDeLaLangue } from "@/lib/blog/rubriques";
import { cheminBlog, cheminRubrique } from "@/lib/blog/motsDuBlog";
import { LANGUE_SANS_PREFIXE, type LanguePublique } from "@/lib/site/langues";

export default function PastillesRubriques({
  langue = LANGUE_SANS_PREFIXE,
  actif,
}: {
  /**
   * LES RUBRIQUES N'EXISTENT QU'EN FRANCAIS, et c'est `rubriquesDeLaLangue`
   * qui le dit : leurs libelles, leurs chapeaux et leur classement sont
   * ecrits en francais et indexes par des slugs francais. Sur une autre
   * langue, la barre ne s'affiche pas du tout, plutot que d'afficher des
   * pastilles francaises au dessus d'articles anglais.
   */
  langue?: LanguePublique;
  actif?: string | null;
}) {
  const rubriques = rubriquesDeLaLangue(langue);
  if (rubriques.length === 0) return null;
  return (
    <nav aria-label="Rubriques du blog" className="flex flex-wrap gap-2">
      <Link href={cheminBlog(langue)} className="tq-pastille" data-actif={actif ? "non" : "oui"}>
        Tous les articles
      </Link>
      {rubriques.map((r) => (
        <Link
          key={r.id}
          href={cheminRubrique(r.id, langue)}
          className="tq-pastille"
          data-actif={actif === r.id ? "oui" : "non"}
        >
          {r.libelle}
        </Link>
      ))}
    </nav>
  );
}
