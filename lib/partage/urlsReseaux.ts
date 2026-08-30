// lib/partage/urlsReseaux.ts
//
// L'ADRESSE DE PARTAGE D'UN RÉSEAU, CALCULÉE À UN SEUL ENDROIT.
//
// Béné, 30 août 2026, sur le blog : "aucune image ne peut être
// repartagée sur Pinterest qui m'aide à faire ranker mon site, les
// images ne sont pas conformes. Y'a pas de proposition de partage de
// l'article."
//
// -- CE QUI CLOCHAIT, ET OÙ ÇA VIVAIT ---------------------------------
//
// Ces neuf URL étaient écrites DANS `PublicQuizClient.tsx`, au milieu
// d'un composant de 5000 lignes. C'est le défaut que l'AGENTS.md décrit
// depuis le 1er août : une logique enfermée dans un composant React
// n'est pas testable, donc elle n'est pas testée, donc c'est là que les
// bugs s'installent. Celui ci y vivait depuis des mois :
//
//     pinterest: `.../pin/create/button/?url=${encoded}&description=${text}`
//
// **Pinterest ne prend PAS l'image de la page** quand on l'appelle comme
// ça. Sans `media=`, son formulaire s'ouvre en demandant au visiteur de
// choisir une image lui même, et neuf fois sur dix il ferme l'onglet.
// Le partage Pinterest du viewer de quiz était donc mort exactement de
// la même façon que celui du blog, et personne ne l'avait vu parce que
// le bouton, lui, s'ouvrait bien.
//
// -- CE QUE PINTEREST ATTEND VRAIMENT ---------------------------------
//
//   - `media` : une URL ABSOLUE d'image. Un chemin relatif ne marche
//     pas, Pinterest ne connaît pas notre domaine ;
//   - un format VERTICAL. Ses recommandations tiennent en un chiffre :
//     2:3 (1000 x 1500). Une couverture 16/9 est acceptée mais elle
//     s'affiche minuscule dans un flux vertical, donc elle ne circule
//     pas. C'est le sens exact de "les images ne sont pas conformes",
//     et c'est `scripts/construire-epingles.mjs` qui les produit.
//
// -- LA MÉCANIQUE EST UN PARAMÈTRE ------------------------------------
//
// `media` est un champ du contexte, jamais deviné. Deviner "s'il y a une
// image sur la page, c'est celle là" marcherait aujourd'hui et casserait
// au premier écran qui en porte deux.

/** Les réseaux qu'on sait ouvrir. Un réseau absent d'ici n'a pas de bouton. */
export const RESEAUX_CONNUS = [
  "x",
  "facebook",
  "linkedin",
  "whatsapp",
  "instagram",
  "pinterest",
  "threads",
  "reddit",
  "email",
] as const;

export type ReseauConnu = (typeof RESEAUX_CONNUS)[number];

export interface ContextePartage {
  /** L'adresse partagée. Absolue, toujours. */
  url: string;
  /** Le message. C'est lui qui devient la description d'une épingle. */
  texte: string;
  /** L'objet d'un email. Sans lui, l'email part sans sujet. */
  titre?: string;
  /**
   * L'image à épingler, ABSOLUE.
   *
   * Utile au seul Pinterest, mais nommée ici parce que c'est le
   * contexte qui la porte : un appelant qui n'en a pas ne l'invente pas.
   */
  media?: string | null;
}

/**
 * L'URL à ouvrir pour partager sur `reseau`, ou `null`.
 *
 * `null` a un sens précis et il n'est pas une erreur : Instagram n'a
 * AUCUNE adresse de partage web. L'appelant doit alors copier le lien et
 * ouvrir Instagram à côté, ce que le viewer fait déjà. Rendre une URL
 * bidon pour "avoir quelque chose" enverrait le visiteur sur un flux
 * vide sans son message.
 */
export function urlPartage(reseau: string, ctx: ContextePartage): string | null {
  const url = encodeURIComponent(String(ctx.url ?? ""));
  const texte = encodeURIComponent(String(ctx.texte ?? ""));
  const titre = encodeURIComponent(String(ctx.titre ?? ctx.texte ?? ""));

  switch (reseau) {
    case "x":
      return `https://twitter.com/intent/tweet?text=${texte}&url=${url}`;
    case "facebook":
      return `https://www.facebook.com/sharer/sharer.php?u=${url}`;
    case "linkedin":
      return `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
    case "reddit":
      return `https://www.reddit.com/submit?url=${url}&title=${texte}`;
    case "threads":
      return `https://www.threads.net/intent/post?text=${texte}%20${url}`;
    case "whatsapp":
      return `https://wa.me/?text=${texte}%20${url}`;
    case "pinterest": {
      // Le `media` est ce qui manquait. On ne l'ajoute que s'il est
      // ABSOLU : un chemin relatif produirait une épingle sans image,
      // c'est à dire exactement le bug qu'on ferme.
      const media = estAbsolue(ctx.media) ? `&media=${encodeURIComponent(ctx.media as string)}` : "";
      return `https://pinterest.com/pin/create/button/?url=${url}${media}&description=${texte}`;
    }
    case "email":
      return `mailto:?subject=${titre}&body=${texte}%0A%0A${url}`;
    case "instagram":
      // Pas d'adresse de partage : l'appelant copie le lien.
      return null;
    default:
      return null;
  }
}

/** Une URL utilisable par un service tiers : absolue et en https. */
export function estAbsolue(valeur: unknown): boolean {
  const v = String(valeur ?? "").trim();
  return /^https?:\/\/[^/\s]+/i.test(v);
}

/**
 * Transforme un chemin de notre site en adresse absolue.
 *
 * Une origine locale (localhost, 127.x) rendrait une épingle qui demande
 * à Pinterest d'aller chercher une image sur la machine du visiteur.
 * C'est le drame de Véronique du 2 août, transposé : un `??` protège du
 * MANQUANT, jamais du FAUX. On rend `null` et l'appelant se tait plutôt
 * que d'annoncer une image introuvable.
 */
export function absolutiser(chemin: string | null | undefined, origine: string): string | null {
  const c = String(chemin ?? "").trim();
  if (!c) return null;
  if (estAbsolue(c)) return c;
  const o = String(origine ?? "").trim().replace(/\/+$/, "");
  if (!estAbsolue(o)) return null;
  if (/^https?:\/\/(localhost|127\.|0\.0\.0\.0|\[::1\])/i.test(o)) return null;
  return `${o}${c.startsWith("/") ? "" : "/"}${c}`;
}
