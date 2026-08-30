// components/site/PastillesRubriques.tsx
//
// LES PASTILLES DE RUBRIQUE.
//
// Ce sont des LIENS, pas des boutons : chaque rubrique a une adresse,
// donc elle s'indexe, se partage et fonctionne sans JavaScript. Un
// filtre en JavaScript aurait la même allure et ne créerait aucune
// page.

import Link from "next/link";
import { rubriquesNonVides } from "@/lib/blog/rubriques";

export default function PastillesRubriques({ actif }: { actif?: string | null }) {
  const rubriques = rubriquesNonVides();
  if (rubriques.length === 0) return null;
  return (
    <nav aria-label="Rubriques du blog" className="flex flex-wrap gap-2">
      <Link href="/blog" className="tq-pastille" data-actif={actif ? "non" : "oui"}>
        Tous les articles
      </Link>
      {rubriques.map((r) => (
        <Link
          key={r.id}
          href={`/blog/rubrique/${r.id}`}
          className="tq-pastille"
          data-actif={actif === r.id ? "oui" : "non"}
        >
          {r.libelle}
        </Link>
      ))}
    </nav>
  );
}
