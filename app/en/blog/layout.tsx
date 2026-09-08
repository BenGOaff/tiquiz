// app/en/blog/layout.tsx
//
// LE BLOG ANGLAIS PORTE LE CADRE DU SITE, COMME LE FRANCAIS.
//
// -- CE QU'IL Y AVAIT AVANT, ET C'EST MESURE ---------------------------
//
// `app/blog/layout.tsx` n'enveloppe QUE `/blog`. Un segment `/en/blog`
// reel n'en herite pas, donc les quatre articles anglais et leur
// sommaire sortaient avec ZERO en-tete, ZERO pied de page et ZERO
// navigation : mesure en servant les deux adresses, `<header>` 1 fois
// en francais, 0 fois en anglais.
//
// Ca ne casse rien a l'oeil, et c'est bien le probleme : la page
// s'affiche parfaitement. Ce qui manque, c'est la sortie (aucun lien
// vers le reste du site), les liens LEGAUX du pied de page, et le
// maillage interne dont ces pages ont justement besoin pour ranker.
//
// -- LES LIBELLES RESTENT EN FRANCAIS, ET C'EST DIT -------------------
//
// `lib/site/nav.ts` est ecrit en francais, et ses destinations le sont
// aussi : `/fonctionnalites`, `/integrations`, `/a-propos` n'ont pas de
// version anglaise. Traduire les LIBELLES sans traduire les PAGES
// promettrait de l'anglais derriere chaque clic, c'est a dire la regle
// « on ne declare que ce qui existe » enfreinte a l'endroit ou elle
// coute le plus : un lecteur qui clique.
//
// Un menu francais sur une page anglaise se voit ; un menu anglais qui
// mene a du francais se decouvre APRES le clic. Entre les deux, on
// prend celui qui ne ment pas, et le chrome se traduira avec les pages
// qu'il annonce.

// -- LES DESTINATIONS, ELLES, SUIVENT LA LANGUE ------------------------
//
// Les libellés restent français (voir juste au dessus), mais un lien
// qui MENE quelque part n'a pas la même contrainte : `hrefPourLangue`
// n'ajoute `/en/` que sur un chemin dont la version anglaise existe
// VRAIMENT. Sans ça, `/en/tarifs` restait un orphelin : il existe, il
// est en anglais, il est dans le sitemap, et AUCUN lien du site ne le
// citait (mesuré le 8 septembre).
//
// La langue est écrite en dur parce que ces pages sont `force-static` :
// prérendues au BUILD, donc sans requête, donc sans en-tête à lire.

import SiteShell from "@/components/site/SiteShell";

export default function BlogLayoutEn({ children }: { children: React.ReactNode }) {
  return <SiteShell langue="en">{children}</SiteShell>;
}
