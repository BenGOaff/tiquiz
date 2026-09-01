// app/blog/rubrique/[rubrique]/page.tsx
//
// UNE RUBRIQUE DU BLOG.
//
// Chaque rubrique est une PAGE, pas un filtre : elle a une adresse,
// donc elle s'indexe et se partage. C'est ce qui fait la différence
// entre "Comparatifs d'outils de quiz" qui remonte sur cette requête,
// et une pastille qui n'existe pour aucun moteur.
//
// `dynamicParams = false` : un identifiant de rubrique qu'on n'a jamais
// écrit répond 404 plutôt que de fabriquer une page vide. Une page vide
// indexée coûte plus cher qu'une page absente.

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ORIGINE_BLOG } from "@/lib/blog/seo";
import { RUBRIQUES, articlesDeLaRubrique, trouverRubrique } from "@/lib/blog/rubriques";
import { CHEMIN_FLUX } from "@/lib/blog/flux";
import CarteArticle from "@/components/site/CarteArticle";
import PastillesRubriques from "@/components/site/PastillesRubriques";

export const dynamic = "force-static";
export const dynamicParams = false;
export const revalidate = 3600;

export function generateStaticParams() {
  return RUBRIQUES.map((r) => ({ rubrique: r.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ rubrique: string }>;
}): Promise<Metadata> {
  const { rubrique } = await params;
  const r = trouverRubrique(rubrique);
  if (!r) return {};
  const titre = `${r.libelle} : les articles Tiquiz`;
  // L'IMAGE DE LA RUBRIQUE EST CELLE DE SON PREMIER ARTICLE.
  //
  // Comme `/blog`, ces pages ne déclaraient AUCUNE `og:image` (mesuré
  // sur la production le 1er septembre) : partagées, elles sortaient
  // nues, et Pinterest n'avait rien à épingler. On prend le visuel que
  // la page affiche déjà en haut, jamais une image dessinée pour
  // l'occasion.
  const couverture = articlesDeLaRubrique(r.id)[0]?.couverture ?? null;
  return {
    title: titre,
    description: r.chapeau,
    alternates: {
      canonical: `${ORIGINE_BLOG}/blog/rubrique/${r.id}`,
      types: { "application/rss+xml": `${ORIGINE_BLOG}${CHEMIN_FLUX}` },
    },
    openGraph: {
      type: "website",
      title: titre,
      description: r.chapeau,
      url: `${ORIGINE_BLOG}/blog/rubrique/${r.id}`,
      siteName: "Tiquiz",
      locale: "fr_FR",
      ...(couverture
        ? { images: [{ url: `${ORIGINE_BLOG}${couverture}`, width: 1200, height: 675 }] }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: titre,
      description: r.chapeau,
      ...(couverture ? { images: [`${ORIGINE_BLOG}${couverture}`] } : {}),
    },
  };
}

export default async function PageRubrique({
  params,
}: {
  params: Promise<{ rubrique: string }>;
}) {
  const { rubrique } = await params;
  const r = trouverRubrique(rubrique);
  if (!r) notFound();
  const articles = articlesDeLaRubrique(r.id);

  return (
    <main className="tq-large py-16 sm:py-20">
      <p className="tq-etiquette">Rubrique</p>
      <h1 className="mt-3 text-[2.4rem] sm:text-[3rem]">{r.libelle}</h1>
      <p className="tq-doux mt-4 max-w-[62ch] text-[1.05rem] leading-relaxed">{r.chapeau}</p>

      <div className="mt-10">
        <PastillesRubriques actif={r.id} />
      </div>

      <div className="mt-12 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((a, i) => (
          <CarteArticle key={a.slug} article={a} priorite={i < 3} />
        ))}
      </div>
    </main>
  );
}
