// app/en/blog/[slug]/page.tsx
//
// UN ARTICLE, EN ANGLAIS.
//
// -- POURQUOI UN SEGMENT REEL, ET PAS LA REECRITURE `/en/` ------------
//
// Le middleware reecrit `/en/<chemin>` vers `/<chemin>` et pose la
// langue dans un en-tete de REQUETE. Ca marche pour une page rendue a
// la demande ; ca ne peut pas marcher ici, pour deux raisons mesurees :
//
//   - la page est `force-static` (elle est prerendue au BUILD, donc
//     sans requete, donc sans en-tete a lire) ;
//   - les slugs anglais ne sont PAS les slugs francais
//     ("create-quiz-systeme-io" contre "comment-creer-quiz-systeme-io"),
//     donc `dynamicParams = false` repondrait 404 sur chacun.
//
// `/en/blog` est donc EXCLU de la reecriture (`lib/site/langues.ts`,
// `CHEMINS_HORS_REECRITURE`), et c'est ce fichier qui repond.
//
// Il ne porte QUE ce qui lui est propre : sa langue. Le corps et les
// metadonnees vivent a un seul endroit, partages avec le francais.
import type { Metadata } from "next";

import { tousLesSlugs } from "@/lib/blog/articles";
import { metadonneesArticle } from "@/lib/blog/metaArticle";
import ArticleBlog from "@/components/site/ArticleBlog";

export const dynamic = "force-static";
export const dynamicParams = false;
export const revalidate = 600;

export function generateStaticParams() {
  return tousLesSlugs("en").map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return metadonneesArticle(slug, "en");
}

export default async function ArticlePageEn({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ArticleBlog slug={slug} langue="en" />;
}
