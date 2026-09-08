// components/site/ArticleBlog.tsx
//
// LE CORPS D'UN ARTICLE, PARTAGE PAR LES DEUX LANGUES.
//
// Bene, 8 septembre 2026 : "on doit les recuperer sur le blog tiquiz.fr
// avec les articles et pages en anglais."
//
// -- POURQUOI UN COMPOSANT, ET PAS DEUX PAGES --------------------------
//
// `/blog/<slug>` et `/en/blog/<slug>` sont deux ROUTES : leurs slugs
// different, et la page est `force-static`, donc elle ne peut pas lire
// l'en-tete de langue que le middleware pose (les pages statiques sont
// rendues au build, sans requete). Il faut donc deux segments reels.
//
// Mais deux COPIES du meme corps divergeraient en une semaine : c'est le
// defaut que ces depots paient depuis juin. Les deux routes ne portent
// donc que ce qui leur est propre (leur langue, leurs `params`, leurs
// metadonnees), et elles appellent CE corps la.
//
// -- LA LANGUE EST UN PARAMETRE OBLIGATOIRE ---------------------------
//
// Elle decide trois choses a la fois : quel dossier on lit, quels mots
// on ecrit autour du texte, et vers ou pointent les liens. Un defaut
// servirait du francais sous une adresse anglaise, et la page
// s'afficherait parfaitement.

import Link from "next/link";
import { notFound } from "next/navigation";

import { lireArticle, listerArticles } from "@/lib/blog/articles";
import type { LanguePublique } from "@/lib/site/langues";
import { cheminBlog, cheminRubrique, motsDuBlog } from "@/lib/blog/motsDuBlog";
import { articlesVoisins, extraireResume } from "@/lib/blog/gabarit";
import { normaliserImages } from "@/lib/blog/imagesArticle";
import { lireCommentairesPublies } from "@/lib/blog/commentairesStore";
import { rubriqueDe } from "@/lib/blog/rubriques";
import { minutesDeLecture, nettoyerBloc, sommaire } from "@/lib/blog/rendu";
import { epinglePour, textePartage } from "@/lib/blog/partage";
import { jsonLdArticle, jsonLdFaq, jsonLdFilDAriane, urlArticle } from "@/lib/blog/seo";

import CarteArticle from "@/components/site/CarteArticle";
import Commentaires from "@/components/site/Commentaires";
import EncartCta from "@/components/site/EncartCta";
import PartageArticle from "@/components/site/PartageArticle";
import RailArticle from "@/components/site/RailArticle";
import VisuelArticle from "@/components/site/VisuelArticle";

function jourLisible(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T12:00:00Z`));
}

export default async function ArticleBlog({
  slug,
  langue,
}: {
  slug: string;
  langue: LanguePublique;
}) {
  const a = lireArticle(slug, langue);
  if (!a) notFound();
  const m = motsDuBlog(langue);

  const { resume, corps } = extraireResume(a.blocs);
  const blocs = normaliserImages(corps);
  const toc = sommaire(a.blocs);
  const minutes = minutesDeLecture(a.blocs);
  const faq = jsonLdFaq(a);
  const rubrique = rubriqueDe(a.slug);
  const voisins = articlesVoisins(a, listerArticles(langue), 3);

  const url = urlArticle(a.slug, langue);
  const epingle = epinglePour(a.slug, langue);
  const partage = textePartage(a);

  const commentaires = await lireCommentairesPublies(a.slug);

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdArticle(a, langue, commentaires.length)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFilDAriane(a, langue)) }}
      />
      {faq ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }}
        />
      ) : null}

      {/* LE CHAPEAU. Il vit dans la colonne de lecture, pas en pleine
          largeur : le titre, le sous-titre et le premier paragraphe
          doivent partir du MÊME bord gauche. C'est la règle du 3 août,
          et c'est ce qui rendait la page bancale. */}
      <header className="tq-large pt-14 sm:pt-20">
        <div className="max-w-[45rem]">
          <nav aria-label={m.filDAriane} className="tq-doux text-sm">
            <Link href={cheminBlog(langue)} className="hover:text-[var(--tq-encre)]">
              {m.blog}
            </Link>
            {rubrique ? (
              <>
                <span className="mx-2">/</span>
                <Link
                  href={cheminRubrique(rubrique.id, langue)}
                  className="hover:text-[var(--tq-encre)]"
                >
                  {rubrique.libelle}
                </Link>
              </>
            ) : null}
          </nav>

          <h1 className="mt-5 text-[2.1rem] leading-[1.1] sm:text-[2.7rem]">{a.titre}</h1>
          <p className="tq-doux mt-4 text-[1.1rem] leading-relaxed">{a.description}</p>
          <p className="tq-doux mt-6 text-sm">
            {m.signature}
            {" | "}
            <time dateTime={a.publieLe}>{jourLisible(a.publieLe, m.locale)}</time>
            {" | "}
            {m.minutesDeLecture(minutes)}
          </p>
        </div>

        {a.couverture ? (
          // La couverture est une image DESSINÉE, pas une capture : elle
          // a droit à plus de largeur que le texte, et elle porte le
          // ratio de ses vignettes.
          <div className="tq-carte-media mt-9 max-w-[56rem]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={a.couverture}
              alt=""
              width={1200}
              height={675}
              // La couverture est la PREMIÈRE image vue : elle se charge
              // tout de suite. Un `lazy` ici retarderait le plus gros
              // élément de la page, donc la note de performance.
              fetchPriority="high"
              {...(epingle ? { "data-pin-media": epingle } : {})}
            />
          </div>
        ) : null}
      </header>

      <div className="tq-large mt-12 grid gap-x-16 lg:grid-cols-[minmax(0,45rem)_20rem] lg:justify-between">
        <div className="min-w-0">
          {/* LE TL;DR, MIS EN ÉVIDENCE. Il était rendu comme un
              paragraphe parmi les autres, alors que c'est le seul que la
              moitié des lecteurs lira. */}
          {resume ? (
            <section className="tq-resume" aria-label={m.enBref}>
              <p className="tq-etiquette">{m.enBref}</p>
              <div
                className="tiquiz-blog mt-2"
                dangerouslySetInnerHTML={{ __html: nettoyerBloc(resume) }}
              />
            </section>
          ) : null}

          {/* LE SOMMAIRE SUR PETIT ÉCRAN. Le rail n'existe pas sous
              1024 px : replié, il ne s'interpose pas entre le lecteur et
              son article. */}
          {toc.length >= 3 ? (
            <details className="tq-sommaire-mobile mt-8 lg:hidden">
              <summary className="tq-etiquette cursor-pointer">{m.dansCetArticle}</summary>
              <ul className="tq-sommaire mt-3 space-y-2 text-[0.95rem]">
                {toc.map((e) => (
                  <li key={e.id} className={e.niveau === 3 ? "pl-3" : ""}>
                    <a href={`#${e.id}`} className="tq-doux hover:text-[var(--tq-bleu)]">
                      {e.texte}
                    </a>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}

          <article className="tiquiz-blog mt-10">
            {blocs.map((b, i) => {
              if (b.type === "titre") {
                const Balise = b.niveau === 2 ? "h2" : "h3";
                return (
                  <Balise key={i} id={b.id} className="scroll-mt-28">
                    {b.texte}
                  </Balise>
                );
              }
              if (b.type === "html") {
                return <div key={i} dangerouslySetInnerHTML={{ __html: nettoyerBloc(b.html) }} />;
              }
              if (b.type === "image") {
                return (
                  <VisuelArticle
                    key={i}
                    src={b.src}
                    alt={b.alt}
                    mobile={b.mobile}
                    epingle={epingle}
                  />
                );
              }
              if (b.type === "cta") {
                return (
                  <p key={i} className="my-10">
                    {/* `tq-bouton-plein` force le blanc du libellé. Sans
                        lui, `.tq-site .tiquiz-blog a` (spécificité 0,3,0)
                        bat `.tq-bouton` (0,1,0) et le texte sortait en
                        bleu foncé sur fond bleu : 1,93:1 de contraste,
                        quand le minimum lisible est 4,5:1. */}
                    <a href={b.url} className="tq-bouton tq-bouton-plein no-underline">
                      {b.texte}
                    </a>
                  </p>
                );
              }
              return (
                <section key={i} className="my-10">
                  {b.questions.map((q, k) => (
                    <details key={k} className="border-b border-[var(--tq-bord)] py-4">
                      <summary className="cursor-pointer font-semibold">{q.question}</summary>
                      <div
                        className="mt-2"
                        dangerouslySetInnerHTML={{ __html: nettoyerBloc(q.reponse) }}
                      />
                    </details>
                  ))}
                </section>
              );
            })}
          </article>

          {/* LE PARTAGE EN BAS : c'est là qu'on a fini de lire, donc
              là qu'on décide si ça valait la peine d'être transmis. Le
              rail le propose aussi, en haut, pour qui décide plus tôt. */}
          <div className="mt-12 border-t border-[var(--tq-bord)] pt-8">
            <p className="tq-etiquette">{m.partagerCetArticle}</p>
            <div className="mt-3">
              <PartageArticle
                url={url}
                titre={a.titre}
                texte={partage}
                epingle={epingle}
              />
            </div>
          </div>

          <EncartCta />

          <Commentaires slug={a.slug} commentaires={commentaires} />
        </div>

        <RailArticle
          sommaire={toc}
          url={url}
          titre={a.titre}
          textePartage={partage}
          epingle={epingle}
        />
      </div>

      {voisins.length > 0 ? (
        <section className="mt-24 bg-[var(--tq-panneau)] py-16">
          <div className="tq-large">
            <h2 className="text-[2rem]">{m.aLireEnsuite}</h2>
            <div className="mt-10 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {voisins.map((x) => (
                <CarteArticle key={x.slug} article={x} langue={langue} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
