// app/blog/[slug]/page.tsx
//
// UN ARTICLE.
//
// Rendu STATIQUEMENT : le contenu est un fichier du dépôt, il ne change
// qu'au déploiement. Une page servie sans aucun aller-retour est aussi
// la meilleure chose qu'on puisse faire pour le référencement, et la
// seule qui tienne si la base est indisponible.

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { lireArticle, listerArticles, tousLesSlugs } from "@/lib/blog/articles";
import { rubriqueDe } from "@/lib/blog/rubriques";
import CarteArticle from "@/components/site/CarteArticle";
import { minutesDeLecture, nettoyerBloc, sommaire } from "@/lib/blog/rendu";
import {
  ORIGINE_BLOG,
  jsonLdArticle,
  jsonLdFaq,
  jsonLdFilDAriane,
  urlArticle,
} from "@/lib/blog/seo";

export const dynamic = "force-static";
export const dynamicParams = false;
export const revalidate = 3600;

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
    alternates: { canonical: urlArticle(a.slug) },
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

  const toc = sommaire(a.blocs);
  const minutes = minutesDeLecture(a.blocs);
  const faq = jsonLdFaq(a);
  const autres = listerArticles()
    .filter((x) => x.slug !== a.slug)
    .slice(0, 3);

  const rubrique = rubriqueDe(a.slug);

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdArticle(a)) }}
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

      {/* LE CHAPEAU, EN PLEINE LARGEUR.
          Le titre respire, la couverture suit dessous. C'est la seule
          partie de la page qui sort du gabarit de lecture : le CORPS,
          lui, reste borné à une longueur de ligne confortable, parce
          qu'un paragraphe de 120 caractères ne se lit pas. */}
      <header className="tq-large pt-14 sm:pt-20">
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

        <h1 className="mt-5 text-[2.1rem] leading-[1.1] sm:text-[2.9rem]">{a.titre}</h1>
        <p className="tq-doux mt-4 max-w-[64ch] text-[1.1rem] leading-relaxed">{a.description}</p>
        <p className="tq-doux mt-6 text-sm">
          Par Béné, fondatrice de Tiquiz{" | "}
          <time dateTime={a.publieLe}>{jourLisible(a.publieLe)}</time>
          {" | "}
          {minutes} min de lecture
        </p>

        {a.couverture ? (
          <div className="tq-carte-media mt-9">
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
            />
          </div>
        ) : null}
      </header>

      <div className="tq-large">
        {toc.length >= 3 ? (
          <nav className="mt-12 rounded-2xl border border-[var(--tq-bord)] bg-white p-6">
            <p className="tq-etiquette">Dans cet article</p>
            <ul className="mt-3 space-y-1.5 text-[0.95rem]">
              {toc.map((e) => (
                <li key={e.id} className={e.niveau === 3 ? "ml-4" : ""}>
                  <a href={`#${e.id}`} className="tq-doux hover:text-[var(--tq-bleu)]">
                    {e.texte}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}

        <article className="tiquiz-blog mt-12">
          {a.blocs.map((b, i) => {
            if (b.type === "titre") {
              const Balise = b.niveau === 2 ? "h2" : "h3";
              return (
                <Balise key={i} id={b.id} className="scroll-mt-24">
                  {b.texte}
                </Balise>
              );
            }
            if (b.type === "html") {
              return <div key={i} dangerouslySetInnerHTML={{ __html: nettoyerBloc(b.html) }} />;
            }
            if (b.type === "image") {
              return (
                // L'image garde SON format : jamais de hauteur imposée,
                // jamais d'`object-cover`. C'est la règle du 4 août, et
                // un schéma recadré ne veut plus rien dire.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={b.src}
                  alt={b.alt}
                  loading="lazy"
                  className="my-8 h-auto w-full"
                />
              );
            }
            if (b.type === "cta") {
              return (
                <p key={i} className="my-10">
                  <a href={b.url} className="tq-bouton no-underline">
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

        {/* CE QUE LE LECTEUR FAIT ENSUITE. Un article qui se termine sur
            un point final renvoie le visiteur à son onglet précédent. */}
        <aside className="mt-16 rounded-3xl bg-[var(--tq-marine)] px-7 py-10 sm:px-10">
          <h2 className="max-w-[22ch] text-[1.5rem] text-white">
            Un quiz qui tague tes leads dans <span className="tq-surb">Systeme.io</span>
          </h2>
          <p className="mt-4 max-w-[52ch] leading-relaxed text-[#b9c3d9]">
            Tiquiz génère le quiz, pose les tags par profil et te rend des leads déjà triés. Plan
            gratuit pour tester, sans carte.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/signup" className="tq-bouton">
              Créer mon quiz gratuitement
            </Link>
            <Link
              href="/"
              className="tq-bouton bg-transparent !text-white ring-1 ring-white/25 hover:!bg-white/10"
            >
              Voir Tiquiz
            </Link>
          </div>
        </aside>
      </div>

      {autres.length > 0 ? (
        <section className="mt-24 bg-[var(--tq-panneau)] py-16">
          <div className="tq-large">
            <h2 className="text-[2rem]">À lire ensuite</h2>
            <div className="mt-10 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {autres.map((x) => (
                <CarteArticle key={x.slug} article={x} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
