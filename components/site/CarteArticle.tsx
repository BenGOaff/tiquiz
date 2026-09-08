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
import { attributsEpingle } from "@/lib/blog/partage";
import { cheminArticle, motsDuBlog } from "@/lib/blog/motsDuBlog";
import type { LanguePublique } from "@/lib/site/langues";

export function jourLisible(iso: string, locale = "fr-FR"): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T12:00:00Z`));
}

export default function CarteArticle({
  article,
  langue,
  priorite = false,
}: {
  article: ResumeArticle;
  /**
   * LA LANGUE DE LA LISTE OU CETTE CARTE VIT.
   *
   * Obligatoire : elle decide vers ou pointe le lien. Un defaut
   * enverrait chaque carte anglaise sur `/blog/<slug-anglais>`, une
   * adresse qui repond 404, et la carte s'afficherait parfaitement.
   */
  langue: LanguePublique;
  /** La première carte visible : elle se charge tout de suite. */
  priorite?: boolean;
}) {
  const m = motsDuBlog(langue);
  // Les rubriques sont indexees par des slugs FRANCAIS : une carte
  // anglaise n'en a donc pas, et son etiquette ne s'affiche pas. C'est
  // honnete, et mieux qu'une etiquette francaise sur une carte anglaise.
  const rubrique = rubriqueDe(article.slug);
  // CE QUE PINTEREST PREND QUAND ON ÉPINGLE DEPUIS LA LISTE.
  //
  // La vignette affichée est une couverture 1200 x 675 : elle ne circule
  // pas dans un flux vertical. `attributsEpingle` désigne l'épingle
  // 1000 x 1500 de l'article ET l'adresse de l'article, sinon l'épingle
  // ramènerait le lecteur sur le sommaire du blog.
  const epingle = attributsEpingle(article, langue);
  return (
    <article className="tq-carte group">
      <Link href={cheminArticle(article.slug, langue)} className="block">
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
              {...epingle}
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
            <time dateTime={article.publieLe}>{jourLisible(article.publieLe, m.locale)}</time>
          </p>
        </div>
      </Link>
    </article>
  );
}
