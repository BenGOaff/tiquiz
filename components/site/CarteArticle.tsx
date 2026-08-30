// components/site/CarteArticle.tsx
//
// LA CARTE D'UN ARTICLE, ÉCRITE UNE FOIS.
//
// Elle sert l'accueil du blog, les pages de rubrique et le bloc "à lire
// ensuite" d'un article. Trois grilles qui recopieraient chacune leur
// carte finiraient par ne plus se ressembler, et c'est exactement le
// défaut que ce dépôt paie depuis juin.
//
// L'image garde SON format : `w-full h-auto`, jamais `object-cover`.
// C'est la règle du 4 août, et ici elle compte doublement : les
// vignettes de Béné portent du TEXTE, qu'un recadrage couperait.

import Link from "next/link";
import type { ResumeArticle } from "@/lib/blog/articles";
import { rubriqueDe } from "@/lib/blog/rubriques";

export function jourLisible(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T12:00:00Z`));
}

export default function CarteArticle({
  article,
  priorite = false,
}: {
  article: ResumeArticle;
  /** La première carte visible : elle se charge tout de suite. */
  priorite?: boolean;
}) {
  const rubrique = rubriqueDe(article.slug);
  return (
    <article className="tq-carte group">
      <Link href={`/blog/${article.slug}`} className="block">
        {article.couverture ? (
          <div className="tq-carte-media">
            {/* Pas de `next/image` : ces visuels sont déjà recompressés
                et servis depuis notre domaine. Une couche de
                transformation en plus, c'est une dépendance de plus qui
                peut casser en production sans casser en local. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={article.couverture}
              alt=""
              width={1200}
              height={675}
              loading={priorite ? "eager" : "lazy"}
              fetchPriority={priorite ? "high" : undefined}
            />
          </div>
        ) : null}
        <div className="mt-4">
          {rubrique ? <p className="tq-etiquette">{rubrique.libelle}</p> : null}
          <h3 className="mt-1.5 text-[1.15rem] leading-snug">{article.titre}</h3>
          <p className="tq-doux mt-2 line-clamp-3 text-[0.9rem] leading-relaxed">
            {article.description}
          </p>
          <p className="tq-doux mt-3 text-xs">
            Béné{" | "}
            <time dateTime={article.publieLe}>{jourLisible(article.publieLe)}</time>
          </p>
        </div>
      </Link>
    </article>
  );
}
