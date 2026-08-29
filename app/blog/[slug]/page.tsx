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

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
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

      <nav className="text-sm text-muted-foreground">
        <Link href="/blog" className="hover:text-foreground">
          Blog
        </Link>
      </nav>

      <article className="mt-4">
        <h1 className="text-4xl font-bold leading-tight tracking-tight">{a.titre}</h1>
        <p className="mt-3 text-lg text-muted-foreground">{a.description}</p>
        <p className="mt-4 text-sm text-muted-foreground">
          Par Béné, fondatrice de Tiquiz{" · "}
          <time dateTime={a.publieLe}>{jourLisible(a.publieLe)}</time>
          {" · "}
          {minutes} min de lecture
        </p>

        {a.couverture ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={a.couverture}
            alt=""
            className="mt-8 w-full rounded-xl"
            // La couverture est la PREMIÈRE image vue : elle se charge
            // tout de suite. Un `lazy` ici retarderait le plus gros
            // élément de la page, donc la note de performance.
            fetchPriority="high"
          />
        ) : null}

        {toc.length >= 3 ? (
          <nav className="mt-10 rounded-xl border bg-muted/30 p-5">
            <p className="text-sm font-semibold">Dans cet article</p>
            <ul className="mt-2 space-y-1 text-sm">
              {toc.map((e) => (
                <li key={e.id} className={e.niveau === 3 ? "ml-4" : ""}>
                  <a href={`#${e.id}`} className="text-muted-foreground hover:text-foreground">
                    {e.texte}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}

        <div className="tiquiz-blog mt-10">
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
              return (
                <div key={i} dangerouslySetInnerHTML={{ __html: nettoyerBloc(b.html) }} />
              );
            }
            if (b.type === "image") {
              return (
                // L'image garde SON format : jamais de hauteur imposée,
                // jamais d'`object-cover`. C'est la règle du 4 août, et
                // un schéma recadré ne veut plus rien dire.
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={b.src} alt={b.alt} loading="lazy" className="my-8 h-auto w-full rounded-lg" />
              );
            }
            if (b.type === "cta") {
              return (
                <p key={i} className="my-8">
                  <a
                    href={b.url}
                    className="inline-block rounded-full bg-foreground px-6 py-3 font-medium text-background no-underline transition-opacity hover:opacity-90"
                  >
                    {b.texte}
                  </a>
                </p>
              );
            }
            return (
              <section key={i} className="my-10">
                {b.questions.map((q, k) => (
                  <details key={k} className="border-b py-3">
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
        </div>
      </article>

      {/* CE QUE LE LECTEUR FAIT ENSUITE. Un article qui se termine sur
          un point final renvoie le visiteur à son onglet précédent. */}
      <aside className="mt-14 rounded-2xl border bg-muted/30 p-6">
        <p className="text-lg font-semibold">Un quiz qui tague tes leads dans Systeme.io</p>
        <p className="mt-1 text-muted-foreground">
          Tiquiz génère le quiz, pose les tags par profil et te rend des leads déjà triés. Plan
          gratuit pour tester, sans carte.
        </p>
        <a
          href="https://tiquiz.fr/"
          className="mt-4 inline-block rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background"
        >
          Voir Tiquiz
        </a>
      </aside>

      {autres.length > 0 ? (
        <section className="mt-14">
          <h2 className="text-xl font-semibold">À lire ensuite</h2>
          <ul className="mt-4 space-y-3">
            {autres.map((x) => (
              <li key={x.slug}>
                <Link href={`/blog/${x.slug}`} className="font-medium hover:underline">
                  {x.titre}
                </Link>
                <p className="text-sm text-muted-foreground">{x.description}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
