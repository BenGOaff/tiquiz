// app/blog/page.tsx
//
// L'ACCUEIL DU BLOG.
//
// La structure vient de Typeform, que Béné a montrée le 30 août : un
// article MIS EN AVANT à gauche, la liste des derniers à droite, puis
// une grille de cartes sous des pastilles de rubrique. Ce qui rend
// cette mise en page utile, c'est qu'elle donne trois entrées
// différentes au même contenu : celui qu'on veut faire lire, ce qui
// vient de sortir, et ce qu'on cherche par sujet.

import Link from "next/link";
import type { Metadata } from "next";

import { listerArticles } from "@/lib/blog/articles";
import { ORIGINE_BLOG, jsonLdListe } from "@/lib/blog/seo";
import { rubriqueDe } from "@/lib/blog/rubriques";
import CarteArticle, { jourLisible } from "@/components/site/CarteArticle";
import PastillesRubriques from "@/components/site/PastillesRubriques";

export const dynamic = "force-static";
export const revalidate = 3600;

const TITRE = "Le blog Tiquiz : quiz, leads et Systeme.io";
const DESCRIPTION =
  "Comment un quiz capte des leads qualifiés, les tague par profil et les transforme en clients. Méthodes, cas concrets et outils, sans jargon.";

export const metadata: Metadata = {
  title: TITRE,
  description: DESCRIPTION,
  alternates: { canonical: `${ORIGINE_BLOG}/blog` },
  openGraph: {
    type: "website",
    title: TITRE,
    description: DESCRIPTION,
    url: `${ORIGINE_BLOG}/blog`,
    siteName: "Tiquiz",
    locale: "fr_FR",
  },
  twitter: { card: "summary_large_image", title: TITRE, description: DESCRIPTION },
};

export default function BlogIndex() {
  const articles = listerArticles();
  const [une, ...reste] = articles;
  const derniers = reste.slice(0, 4);
  const grille = reste.slice(0, 6);
  const rubriqueUne = une ? rubriqueDe(une.slug) : null;

  return (
    <main>
      {/* LE JSON-LD DIT À GOOGLE CE QU'EST CETTE PAGE. Sans lui, une
          liste d'articles n'est qu'une page de liens de plus. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdListe(articles)) }}
      />

      <section className="tq-large pt-16 sm:pt-24">
        <p className="tq-etiquette">Le blog</p>
        <h1 className="mt-3 max-w-[16ch] text-[2.6rem] sm:text-[3.4rem]">
          Des quiz qui <span className="tq-surb">rapportent</span>
        </h1>
        <p className="tq-doux mt-5 max-w-[62ch] text-[1.05rem] leading-relaxed">{DESCRIPTION}</p>
      </section>

      {articles.length === 0 ? (
        <p className="tq-doux tq-large py-20">
          Aucun article pour le moment.
        </p>
      ) : (
        <>
          {/* LE CHAPEAU À DEUX COLONNES. */}
          <section className="tq-large mt-14 grid gap-14 lg:grid-cols-[1.55fr_1fr]">
            <article className="tq-carte group">
              <Link href={`/blog/${une.slug}`} className="block">
                {une.couverture ? (
                  <div className="tq-carte-media">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={une.couverture}
                      alt=""
                      width={1200}
                      height={675}
                      fetchPriority="high"
                    />
                  </div>
                ) : null}
                <div className="mt-5">
                  {rubriqueUne ? <p className="tq-etiquette">{rubriqueUne.libelle}</p> : null}
                  <h2 className="mt-2 text-[1.75rem] leading-tight sm:text-[2.05rem]">
                    {une.titre}
                  </h2>
                  <p className="tq-doux mt-3 max-w-[62ch] leading-relaxed">{une.description}</p>
                  <p className="tq-doux mt-4 text-xs">
                    Béné{" | "}
                    <time dateTime={une.publieLe}>{jourLisible(une.publieLe)}</time>
                  </p>
                </div>
              </Link>
            </article>

            <aside>
              <h2 className="text-xl">Les derniers</h2>
              <ul className="mt-5">
                {derniers.map((a) => (
                  <li key={a.slug} className="border-t border-[var(--tq-bord)] py-4 first:border-t-0 first:pt-0">
                    <Link href={`/blog/${a.slug}`} className="group block">
                      <h3 className="text-[0.98rem] font-semibold leading-snug transition-colors group-hover:text-[var(--tq-bleu)]">
                        {a.titre}
                      </h3>
                      <p className="tq-doux mt-1.5 text-xs">
                        Béné{" | "}
                        <time dateTime={a.publieLe}>{jourLisible(a.publieLe)}</time>
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </aside>
          </section>

          {/* LA GRILLE, SOUS SES PASTILLES. */}
          <section className="mt-24 bg-[var(--tq-panneau)] py-16">
            <div className="tq-large">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-[2rem]">Choisis un sujet</h2>
                <PastillesRubriques />
              </div>
              <div className="mt-10 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
                {grille.map((a, i) => (
                  <CarteArticle key={a.slug} article={a} priorite={i < 3} />
                ))}
              </div>
            </div>
          </section>

          {/* CE QUE LE LECTEUR FAIT ENSUITE. */}
          <section className="tq-large py-24">
            <div className="rounded-3xl bg-[var(--tq-marine)] px-8 py-14 text-center sm:px-14">
              <h2 className="mx-auto max-w-[20ch] text-[1.9rem] text-white sm:text-[2.4rem]">
                Ton premier quiz tourne <span className="tq-surb">ce soir</span>
              </h2>
              <p className="mx-auto mt-5 max-w-[52ch] leading-relaxed text-[#b9c3d9]">
                Tiquiz écrit le quiz, pose les tags par profil et te rend des leads déjà triés dans
                Systeme.io. Sans Zapier, sans Make.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link href="/signup" className="tq-bouton">
                  Créer mon quiz gratuitement
                </Link>
                <Link
                  href="/"
                  className="tq-bouton bg-transparent !text-white ring-1 ring-white/25 hover:!bg-white/10"
                >
                  Voir ce que fait Tiquiz
                </Link>
              </div>
              <p className="mt-5 text-xs text-[#7f8db0]">
                Plan gratuit, sans carte bancaire et sans limite de durée.
              </p>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
