// lib/embed/remise.ts
//
// OÙ VIT LE GÉNÉRATEUR, ET LES DEUX CHOSES QUE ÇA DÉCIDE.
//
// Béné, 8 septembre 2026 : "le générateur de quiz sur une page dédiée,
// optimisée seo, dans le style du blog et des pages de ventes etc."
//
// ── LE BOUTON ÉTAIT MORT HORS IFRAME, ET C'EST MESURÉ ────────────────
//
// Le générateur anonyme a été écrit pour vivre DANS une iframe, sur la
// page de vente. Son bouton principal, celui qui transforme un visiteur
// en inscrit, faisait :
//
//     window.parent.postMessage({ type: "tiquiz-embed-checkout", ... })
//
// et le pont de la page hôte (`public/embed/bridge.js`) écoutait.
//
// **Hors iframe, `window.parent` EST `window`.** Le message part vers
// la page elle même, personne n'écoute, et le bouton ne fait RIEN.
// Aucune erreur, aucun symptôme : il s'affiche, on clique, il ne se
// passe rien. C'est le `ok: false` muet du 3 août, sur le seul bouton
// qui rapporte de l'argent.
//
// ── UN SEUL FAIT, DEUX CONSÉQUENCES ──────────────────────────────────
//
// `QuizDetailClient` déduisait le mode embed de la PRÉSENCE du jeton
// (`const isEmbed = !!embedSessionToken`). Or le jeton dit "ce quiz est
// anonyme", il ne dit PAS "on est dans une iframe" : sur la page dédiée
// les deux ne sont plus vrais ensemble.
//
// Le fait qui décide est donc OÙ LE GÉNÉRATEUR EST POSÉ, et il en
// découle DEUX choses qui doivent rester d'accord :
//
//   1. comment on rend la main (message ou navigation) ;
//   2. quel cadre le générateur occupe (tout l'écran, ou une section).
//
// Deux paramètres séparés finiraient par se désaccorder : un cadre de
// page avec une remise d'iframe donne exactement le bouton mort. Un
// seul paramètre les rend impossibles à contredire.
//
// Et il est OBLIGATOIRE : le type des props de `QuizDetailClient` est
// une union discriminée, donc fournir un jeton sans dire où l'on est ne
// compile pas. C'est la règle du 1er août, et c'est la seule protection
// qui survit au prochain qui touchera au fichier.
//
// ── ON NE RÉÉCRIT PAS L'ADRESSE D'INSCRIPTION ────────────────────────
//
// Elle vit depuis le 2 septembre dans `lib/embed/reprise.ts`, avec sa
// validation d'UUID et son chemin RELATIF (la page est servie sur
// `tiquiz.fr` en public et sur le domaine de l'app derrière la clé
// d'aperçu : une adresse absolue serait juste dans un cas et fausse
// dans l'autre, et l'erreur ne se verrait qu'en cliquant). Deux
// écritures de la même adresse finiraient par diverger, et c'est celle
// du bouton qui enverrait dans le vide.

import { urlInscriptionReprise } from "@/lib/embed/reprise";

/**
 * Où le générateur est posé. Il n'y a que deux endroits.
 *
 * `iframe` : sur une page hôte, la nôtre ou celle de quelqu'un d'autre.
 *            C'est elle qui sait où envoyer le visiteur, via le pont.
 * `page`   : le générateur EST la page (`/generateur-de-quiz`). Il n'y
 *            a pas de parent, donc on navigue nous mêmes.
 */
export type ContexteGenerateur = "iframe" | "page";

export type Remise =
  | { genre: "message" }
  | { genre: "navigation"; url: string };

/**
 * Ce que le bouton doit faire.
 *
 * Pur : il ne touche ni à `window`, ni au DOM. C'est ce qui le rend
 * testable, et c'est tout l'intérêt de le sortir du composant (règle du
 * 1er août : une logique enfermée dans un composant React n'est pas
 * testable, donc elle n'est pas testée).
 */
export function remisePourLeBouton(contexte: ContexteGenerateur, jeton: unknown): Remise {
  if (contexte === "iframe") return { genre: "message" };
  return { genre: "navigation", url: urlInscriptionReprise(jeton) };
}

/**
 * LE CADRE, ET POURQUOI IL NE PEUT PAS ÊTRE LE MÊME.
 *
 * Dans une iframe, le générateur a le document pour lui tout seul : il
 * prend toute la hauteur et pose le fond de l'app, ce qui est juste.
 *
 * Sur la page dédiée, il vit à l'intérieur d'une section du site : lui
 * laisser `100dvh` réserverait un écran entier pour un formulaire à
 * cinq champs, et son fond écraserait celui du site sur toute cette
 * hauteur. C'est le mélange des deux systèmes visuels que Béné a relevé
 * le 4 septembre ("deux systèmes visuels sur un même domaine, c'est
 * deux sites empilés").
 *
 * On rend des CLASSES, pas du JSX : le composant reste seul maître de
 * ce qu'il dessine, et cette décision reste testable.
 */
export function cadreDuGenerateur(contexte: ContexteGenerateur): {
  /** L'enveloppe des étapes avant l'éditeur (le formulaire, l'attente). */
  enveloppe: string;
  /** L'enveloppe de l'éditeur, qui est lui même en `h-screen`. */
  editeur: string;
} {
  if (contexte === "iframe") {
    return {
      enveloppe: "min-h-[100dvh] bg-background text-foreground flex flex-col",
      editeur: "",
    };
  }
  return {
    // Pas de `100dvh` et pas de fond de page : la section du site porte
    // déjà le sien, et le formulaire fait cinq champs. La carte, elle,
    // pose `bg-background` : `.tql` impose sa couleur de texte et son
    // fond crème à tout ce qu'il contient, et l'outil ne doit pas les
    // hériter.
    enveloppe: "text-foreground flex flex-col rounded-2xl border bg-background overflow-hidden",
    // L'ÉDITEUR EST EN `h-screen` CHEZ LUI, et c'est ce qui décide de
    // cette valeur : une boîte plus COURTE que son contenu le
    // ROGNERAIT, donc la créatrice perdrait le bas de son éditeur sans
    // qu'aucun test ne le dise (règle du 7 septembre : un débordement
    // n'est une perte que s'il est rogné, et ici il le serait). On pose
    // donc exactement la même hauteur, et `overflow-hidden` ne coupe
    // alors rien : il tient les coins arrondis.
    editeur: "h-screen overflow-hidden rounded-2xl border bg-background",
  };
}
