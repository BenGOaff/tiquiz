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

import type { Metadata } from "next";

import { tousLesSlugs } from "@/lib/blog/articles";
import { metadonneesArticle } from "@/lib/blog/metaArticle";
import { LANGUE_SANS_PREFIXE } from "@/lib/site/langues";
import ArticleBlog from "@/components/site/ArticleBlog";

export const dynamic = "force-static";
export const dynamicParams = false;
export const revalidate = 600;

// CETTE ROUTE SERT LA LANGUE SANS PREFIXE, ET ELLE LE DIT.
//
// L'anglais a ses PROPRES segments (`app/en/blog/[slug]`) : ses slugs
// different des francais, donc il ne peut pas passer par ici. Et ce
// n'est pas qu'une question de slug : la page est `force-static`, donc
// elle est rendue au BUILD, sans requete, donc elle ne peut pas lire
// l'en-tete de langue que le middleware pose sur `/en/...`. Deux
// segments reels sont la seule forme qui marche.
//
// Le CORPS, lui, vit a un seul endroit (`components/site/ArticleBlog`) :
// deux copies divergeraient en une semaine.
export function generateStaticParams() {
  return tousLesSlugs(LANGUE_SANS_PREFIXE).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return metadonneesArticle(slug, LANGUE_SANS_PREFIXE);
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ArticleBlog slug={slug} langue={LANGUE_SANS_PREFIXE} />;
}
