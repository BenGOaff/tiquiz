// app/blog/[slug]/page.tsx
//
// UN ARTICLE.
//
// -- LA MISE EN PAGE, REPRISE DE TYPEFORM (Béné, 30 août 2026) --------
//
// "certaines images sont d'une taille disproportionnée c'est carrément
// n'importe quoi. Le contenu est mal réparti, dur à lire : tu as bien
// étudié le blog et les articles de Typeform ? Pourquoi tu gardes pas un
// sticky bar avec les principaux CTA et/ou articles relatifs ? Le TL;DR
// du début doit être mis en évidence, comme sur la plupart des blogs
// sérieux."
//
// Tout ce qu'elle décrit vient d'UN chiffre, mesuré avant correction :
// **le corps de l'article faisait 1168 px de large**. À 18 px, ça fait
// 150 caractères par ligne, et l'oeil perd le début de la ligne
// suivante. Les images héritaient de cette largeur, donc une capture de
// 500 px était étirée à 1168, et une variante téléphone de 760 x 1400
// occupait 2151 px de haut.
//
// La page est donc une GRILLE : 720 px de lecture, 320 px de rail. Le
// rail porte ce qui doit rester sous les yeux (sommaire, partage,
// invitation), le bas de page porte ce qu'on choisit après avoir fini.
//
// -- CE QUI EST RENDU, ET PAR QUI -------------------------------------
//
// Aucune décision n'est prise dans ce fichier :
//   - `extraireResume` sort le TL;DR du corps (lib/blog/gabarit.ts) ;
//   - `normaliserImages` apparie les variantes desktop / téléphone et
//     retire les doublons (lib/blog/imagesArticle.ts) ;
//   - `tailleRendue` borne chaque image (lib/blog/imagesDisque.ts) ;
//   - `articlesVoisins` choisit la suite (lib/blog/gabarit.ts) ;
//   - `urlPartage` construit les liens de partage (lib/partage/).
// Toutes sont pures et testées. Une décision écrite dans le JSX est une
// décision que personne ne peut vérifier.
//
// -- ELLE RESTE STATIQUE, MAIS ELLE SE REVALIDE -----------------------
//
// `force-static` PLUS `revalidate` : la page est prérendue au build et
// régénérée toutes les dix minutes. Les deux sont nécessaires.
//
//   - sans `force-static`, la lecture des commentaires est une requête
//     non mise en cache, donc Next bascule TOUTE la page en rendu à la
//     demande. Vérifié dans la sortie de `next build` : l'article
//     passait de prérendu à dynamique. Un blog rendu à chaque visite,
//     c'est le contraire de ce qu'on cherche pour le référencement.
//   - sans `revalidate`, la page serait figée au build : un commentaire
//     publié par Béné n'apparaîtrait jamais, et elle conclurait que le
//     bouton ne marche pas (scénario Jocelyne du 1er août).
//
// CE COMMENTAIRE DISAIT « dix minutes de retard sur une conversation,
// personne ne les voit ». C'ÉTAIT FAUX, et Béné l'a payé le 1er
// septembre : "il m'a dit c'est en ligne actualise la page pour le voir,
// mais non je vois rien." La seule personne à qui on demande de
// recharger est justement celle qui vient d'écrire, et c'est la seule
// que dix minutes de cache empêchent de se voir.
//
// `POST /api/blog/commentaires` appelle donc `revalidatePath` sur cette
// page dès qu'un commentaire est PUBLIÉ. Les dix minutes ne servent plus
// qu'au reste (un article corrigé, un commentaire modéré à la main).

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { lireArticle, listerArticles, tousLesSlugs } from "@/lib/blog/articles";
import { articlesVoisins, extraireResume } from "@/lib/blog/gabarit";
import { normaliserImages } from "@/lib/blog/imagesArticle";
import { lireCommentairesPublies } from "@/lib/blog/commentairesStore";
import { rubriqueDe } from "@/lib/blog/rubriques";
import { minutesDeLecture, nettoyerBloc, sommaire } from "@/lib/blog/rendu";
import { epinglePour, textePartage } from "@/lib/blog/partage";
import { CHEMIN_FLUX } from "@/lib/blog/flux";
import {
  ORIGINE_BLOG,
  jsonLdArticle,
  jsonLdFaq,
  jsonLdFilDAriane,
  urlArticle,
} from "@/lib/blog/seo";

import CarteArticle from "@/components/site/CarteArticle";
import Commentaires from "@/components/site/Commentaires";
import EncartCta from "@/components/site/EncartCta";
import PartageArticle from "@/components/site/PartageArticle";
import RailArticle from "@/components/site/RailArticle";
import VisuelArticle from "@/components/site/VisuelArticle";

export const dynamic = "force-static";
export const dynamicParams = false;
export const revalidate = 600;

export function generateStaticParams() {
  return tousLesSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const a = lireArticle(slug);
  if (!a) return {};
  const image = a.couverture ? `${ORIGINE_BLOG}${a.couverture}` : undefined;
  return {
    title: a.titre,
    description: a.description,
    keywords: a.motsCles.length ? a.motsCles : undefined,
    authors: [{ name: "Bénédicte Lagardette" }],
    // LA CANONIQUE DÉSIGNE LA NÔTRE, sans hésiter. Deux copies du même
    // article se partagent le crédit, et c'est ce qui empêche de
    // ranker.
    alternates: {
      canonical: urlArticle(a.slug),
      // Le flux est annoncé sur l'article aussi : c'est la page qu'on
      // partage, donc celle où quelqu'un qui veut suivre le blog arrive.
      types: { "application/rss+xml": `${ORIGINE_BLOG}${CHEMIN_FLUX}` },
    },
    openGraph: {
      type: "article",
      title: a.titre,
      description: a.description,
      url: urlArticle(a.slug),
      siteName: "Tiquiz",
      locale: "fr_FR",
      publishedTime: a.publieLe,
      authors: ["Bénédicte Lagardette"],
      ...(image ? { images: [{ url: image }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: a.titre,
      description: a.description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

function jourLisible(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T12:00:00Z`));
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = lireArticle(slug);
  if (!a) notFound();

  const { resume, corps } = extraireResume(a.blocs);
  const blocs = normaliserImages(corps);
  const toc = sommaire(a.blocs);
  const minutes = minutesDeLecture(a.blocs);
  const faq = jsonLdFaq(a);
  const rubrique = rubriqueDe(a.slug);
  const voisins = articlesVoisins(a, listerArticles(), 3);

  const url = urlArticle(a.slug);
  const epingle = epinglePour(a.slug);
  const partage = textePartage(a);

  const commentaires = await lireCommentairesPublies(a.slug);

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdArticle(a, commentaires.length)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFilDAriane(a)) }}
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
          <nav aria-label="Fil d'Ariane" className="tq-doux text-sm">
            <Link href="/blog" className="hover:text-[var(--tq-encre)]">
              Blog
            </Link>
            {rubrique ? (
              <>
                <span className="mx-2">/</span>
                <Link
                  href={`/blog/rubrique/${rubrique.id}`}
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
            Par Béné, fondatrice de Tiquiz{" | "}
            <time dateTime={a.publieLe}>{jourLisible(a.publieLe)}</time>
            {" | "}
            {minutes} min de lecture
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
            <section className="tq-resume" aria-label="En bref">
              <p className="tq-etiquette">En bref</p>
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
              <summary className="tq-etiquette cursor-pointer">Dans cet article</summary>
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
            <p className="tq-etiquette">Partager cet article</p>
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
            <h2 className="text-[2rem]">À lire ensuite</h2>
            <div className="mt-10 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {voisins.map((x) => (
                <CarteArticle key={x.slug} article={x} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
