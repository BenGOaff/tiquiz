// components/site/SommaireBlog.tsx
//
// L'ACCUEIL DU BLOG, ECRIT UNE FOIS POUR LES DEUX LANGUES.
//
// La structure vient de Typeform, que Béné a montrée le 30 août : un
// article MIS EN AVANT à gauche, la liste des derniers à droite, puis
// une grille de cartes sous des pastilles de rubrique. Ce qui rend
// cette mise en page utile, c'est qu'elle donne trois entrées
// différentes au même contenu : celui qu'on veut faire lire, ce qui
// vient de sortir, et ce qu'on cherche par sujet.
//
// -- POURQUOI UN COMPOSANT, ET PAS DEUX PAGES -------------------------
//
// `/blog` et `/en/blog` sont deux segments REELS (le blog est
// `force-static`, et les slugs anglais ne sont pas les francais : voir
// `CHEMINS_HORS_REECRITURE`). Deux pages qui redessineraient chacune
// leur sommaire divergeraient en une semaine, et c'est le defaut que ce
// depot paie en boucle depuis juin. La langue est un PARAMETRE, jamais
// devinee : un defaut a "fr" servirait du francais sous `/en/blog`, la
// page s'afficherait parfaitement, et Google indexerait ca.

import Link from "next/link";

import { listerArticles } from "@/lib/blog/articles";
import { jsonLdListe } from "@/lib/blog/seo";
import { rubriqueDe, rubriquesDeLaLangue } from "@/lib/blog/rubriques";
import { cheminArticle, motsDuBlog } from "@/lib/blog/motsDuBlog";
import CarteArticle, { jourLisible } from "@/components/site/CarteArticle";
import PastillesRubriques from "@/components/site/PastillesRubriques";
import { attributsEpingle } from "@/lib/blog/partage";
import type { LanguePublique } from "@/lib/site/langues";

export default function SommaireBlog({ langue }: { langue: LanguePublique }) {
  const m = motsDuBlog(langue);
  const s = m.sommaire;
  const articles = listerArticles(langue);
  const [une, ...reste] = articles;
  const derniers = reste.slice(0, 4);
  // LA GRILLE PORTE TOUT LE BLOG, PLUS SEULEMENT SIX ARTICLES.
  //
  // 1er septembre 2026 : `reste.slice(0, 6)` plafonnait l'accueil à sept
  // articles (celui en une, plus six), alors que le sitemap en annonçait
  // onze. Les quatre plus anciens n'étaient donc atteignables que par
  // leur rubrique : Google les connaissait, un lecteur arrivé sur /blog
  // ne pouvait pas les trouver, et aucun lien interne ne leur passait de
  // poids depuis la page la plus visitée du blog.
  //
  // Pas de pagination : elle enfermerait à nouveau les anciens articles
  // derrière un clic. Le jour où la grille devient trop longue, ce sera
  // un vrai découpage par rubrique, pas un « page 2 ».
  const grille = reste;
  const rubriqueUne = une ? rubriqueDe(une.slug) : null;
  const aDesRubriques = rubriquesDeLaLangue(langue).length > 0;

  return (
    <main>
      {/* LE JSON-LD DIT À GOOGLE CE QU'EST CETTE PAGE. Sans lui, une
          liste d'articles n'est qu'une page de liens de plus. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdListe(articles, langue)) }}
      />

      <section className="tq-large pt-16 sm:pt-24">
        <p className="tq-etiquette">{s.etiquette}</p>
        <h1 className="mt-3 max-w-[16ch] text-[2.6rem] sm:text-[3.4rem]">
          {s.titreDebut}
          <span className="tq-surb">{s.titreSurb}</span>
        </h1>
        <p className="tq-doux mt-5 max-w-[62ch] text-[1.05rem] leading-relaxed">
          {s.metaDescription}
        </p>
      </section>

      {articles.length === 0 ? (
        <p className="tq-doux tq-large py-20">{s.aucunArticle}</p>
      ) : (
        <>
          {/* LE CHAPEAU À DEUX COLONNES. */}
          <section className="tq-large mt-14 grid gap-14 lg:grid-cols-[1.55fr_1fr]">
            <article className="tq-carte group">
              <Link href={cheminArticle(une.slug, langue)} className="block">
                {une.couverture ? (
                  <div className="tq-carte-media">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={une.couverture}
                      alt=""
                      width={1200}
                      height={675}
                      fetchPriority="high"
                      {...attributsEpingle(une, langue)}
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
                    <time dateTime={une.publieLe}>{jourLisible(une.publieLe, m.locale)}</time>
                  </p>
                </div>
              </Link>
            </article>

            <aside>
              <h2 className="text-xl">{s.lesDerniers}</h2>
              <ul className="mt-5">
                {derniers.map((a) => (
                  <li
                    key={a.slug}
                    className="border-t border-[var(--tq-bord)] py-4 first:border-t-0 first:pt-0"
                  >
                    <Link href={cheminArticle(a.slug, langue)} className="group block">
                      <h3 className="text-[0.98rem] font-semibold leading-snug transition-colors group-hover:text-[var(--tq-bleu)]">
                        {a.titre}
                      </h3>
                      <p className="tq-doux mt-1.5 text-xs">
                        Béné{" | "}
                        <time dateTime={a.publieLe}>{jourLisible(a.publieLe, m.locale)}</time>
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
                <h2 className="text-[2rem]">
                  {aDesRubriques ? s.choisisUnSujet : s.tousLesArticles}
                </h2>
                <PastillesRubriques langue={langue} />
              </div>
              <div className="mt-10 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
                {grille.map((a, i) => (
                  <CarteArticle key={a.slug} article={a} langue={langue} priorite={i < 3} />
                ))}
              </div>
            </div>
          </section>

          {/* CE QUE LE LECTEUR FAIT ENSUITE. */}
          <section className="tq-large py-24">
            {/* PAS D'APLAT SOUS DU TEXTE (Béné, 31 août 2026). Même
                gabarit que la fin d'article : du blanc, un filet
                HORIZONTAL, le texte à l'encre du site. */}
            <div className="rounded-3xl border border-[var(--tq-bord)] bg-white px-8 py-12 text-center sm:px-14 sm:py-14">
              <span
                aria-hidden="true"
                className="mx-auto block h-[3px] w-12 rounded-full bg-[var(--tq-bleu)]"
              />
              <h2 className="mx-auto mt-6 max-w-[20ch] text-[1.9rem] sm:text-[2.4rem]">
                {s.ctaTitreDebut}
                <span className="tq-surb">{s.ctaTitreSurb}</span>
              </h2>
              {/* Sur un telephone ce paragraphe rend QUATRE lignes (mesure du
                  7 septembre a 390 px), donc il s aligne a gauche : sa regle
                  dit "plus de deux lignes, texte a gauche". Sur grand ecran
                  il tient en deux lignes et la carte reste centree. */}
              <p className="tq-doux mx-auto mt-5 max-w-[52ch] leading-relaxed max-sm:text-left">
                {s.ctaCorps}
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link href="/signup" className="tq-bouton tq-bouton-plein">
                  {s.ctaBouton}
                </Link>
                {/* LE SECOND BOUTON N'EXISTE QUE LA OU SA DESTINATION EXISTE.
                    `/` sert la page de vente CAPTUREE, en francais : sur le
                    blog anglais on n'affiche rien plutot que d'envoyer un
                    lecteur anglophone sur une page francaise. */}
                {s.ctaSecondaire ? (
                  <Link href="/" className="tq-bouton tq-bouton-fantome">
                    {s.ctaSecondaire}
                  </Link>
                ) : null}
              </div>
              <p className="tq-doux mt-5 text-xs">{s.ctaRassurance}</p>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
