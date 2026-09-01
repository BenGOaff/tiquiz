// lib/quiz/affiliateRelay.ts
//
// UN QUIZ PORTE L'AFFILIÉ QUI L'A PARTAGÉ (demande Maurice, 27 août 2026).
//
// Maurice met un quiz à disposition de ses affiliés. Aujourd'hui il
// DUPLIQUE le quiz une fois par affilié, pour savoir qui lui a amené
// quel contact. Un quiz par affilié, donc des statistiques éparpillées,
// une correction à reporter autant de fois qu'il a de partenaires, et
// un travail manuel à chaque nouvel arrivant.
//
// Il n'en faut qu'un. L'affilié colle son identifiant à la fin du lien
// du quiz, et c'est le quiz qui le transporte.
//
// -- LES DEUX MOITIÉS, ET ELLES NE FONT PAS LA MÊME CHOSE --------------
//
// 1. ÉTIQUETER LE LEAD : qui a amené ce contact. C'est ce qui remplit la
//    colonne "source" des statistiques, et ce qu'on écrit sur la fiche
//    contact du vendeur.
// 2. FAIRE PAYER LA COMMISSION : ça, c'est le système de vente du
//    vendeur, et il ne lit pas nos colonnes. Il lit SON cookie, posé
//    quand le visiteur atterrit sur SA page. D'où `attacherAffiliate` :
//    le bouton de fin de quiz emmène l'identifiant avec lui.
//
// En n'en faisant qu'une, on promet à un affilié un suivi qui s'affiche
// et une commission qui n'arrive pas.
//
// -- `sa` ET `ref` NE SE DEVINENT JAMAIS L'UN L'AUTRE ------------------
//
// `sa` est l'identifiant que Systeme.io fabrique pour SES tunnels ;
// `ref` est notre code public. Ils voyagent dans des champs séparés,
// comme partout ailleurs dans ces dépôts. Deviner à la forme marcherait
// aujourd'hui et casserait le jour où une affiliée choisit un code qui
// ressemble à un `sa`.
//
// On transporte les deux SANS CHOISIR : on ne sait pas vers quel système
// pointe le bouton de la créatrice, et chaque système ignore le
// paramètre qu'il ne connaît pas. Choisir à sa place, c'est se tromper
// une fois sur deux.

import { readRef, REF_PARAM } from "@/lib/affiliate/refLien";
import { readSa, SA_PARAM } from "@/lib/affiliate/sa";
import { CANAL_PARAM, canalDeLUrl, lireCanalBrut } from "@/lib/affiliate/signalerClic";

export { CANAL_PARAM, REF_PARAM, SA_PARAM };

/** Ce que le lien du quiz portait. Chaque champ peut manquer. */
export interface AffiliateDuQuiz {
  /** L'identifiant Systeme.io de l'affilié du vendeur. */
  sa: string | null;
  /** Notre code public. */
  ref: string | null;
  /** `?c=youtube` : le tag que l'affilié pose lui même. */
  canal: string | null;
}

export const AFFILIATE_VIDE: AffiliateDuQuiz = { sa: null, ref: null, canal: null };

/**
 * Lit l'affilié dans la query d'une URL de quiz.
 *
 * PURE. Ne jette jamais : la valeur vient d'une URL publique, donc de
 * n'importe où. Les formats sont ceux de `readSa` / `readRef`, JAMAIS
 * réécrits ici : un code accepté à un endroit et refusé à un autre,
 * c'est un affilié qui n'est jamais payé, sans le moindre symptôme.
 */
export function lireAffiliateDuQuiz(
  search: string | URLSearchParams | null | undefined,
): AffiliateDuQuiz {
  if (!search) return AFFILIATE_VIDE;
  let params: URLSearchParams;
  try {
    params = typeof search === "string" ? new URLSearchParams(search) : search;
  } catch {
    return AFFILIATE_VIDE;
  }
  return {
    sa: readSa(params.get(SA_PARAM)),
    ref: readRef(params.get(REF_PARAM)),
    canal: canalDeLUrl(params),
  };
}

/** Rien à transporter : le visiteur est venu de lui même. */
export function affiliateAbsent(a: AffiliateDuQuiz | null | undefined): boolean {
  return !a || (!a.sa && !a.ref);
}

/**
 * Recolle l'affilié sur un lien qui SORT du quiz.
 *
 * C'est la moitié qui PAIE : le visiteur atterrit sur la page de vente
 * avec l'identifiant, le système du vendeur pose son cookie, et la vente
 * lui est attribuée.
 *
 * TROIS REFUS, et chacun a coûté quelque chose quelque part :
 *
 * - un schéma qui n'est ni http ni https est rendu TEL QUEL. `mailto:`
 *   et `tel:` n'ont pas de query, et `javascript:` ne doit jamais être
 *   manipulé : y coller un paramètre reviendrait à fabriquer du code.
 * - un paramètre DÉJÀ présent n'est jamais remplacé. Si la créatrice a
 *   écrit son propre `?sa=` dans son bouton, c'est le sien qui compte :
 *   c'est son lien, pas le nôtre.
 * - une URL illisible est rendue telle quelle. Un bouton qui mène
 *   quelque part vaut mieux qu'un bouton mort.
 */
export function attacherAffiliate(
  url: string | null | undefined,
  a: AffiliateDuQuiz | null | undefined,
): string {
  const brut = String(url ?? "").trim();
  if (!brut || affiliateAbsent(a)) return brut;

  // Un schéma non http(s) explicite : on ne touche à rien.
  const schema = /^([a-z][a-z0-9+.-]*):/i.exec(brut)?.[1]?.toLowerCase();
  if (schema && schema !== "http" && schema !== "https") return brut;

  // `base` sert uniquement à parser un chemin relatif ; elle ne ressort
  // jamais, on rend la même forme (relative ou absolue) qu'on a reçue.
  const BASE = "https://exemple.invalid";
  let u: URL;
  try {
    u = new URL(brut, BASE);
  } catch {
    return brut;
  }

  const poser = (cle: string, valeur: string | null) => {
    if (!valeur) return;
    if (u.searchParams.has(cle)) return;
    u.searchParams.set(cle, valeur);
  };
  poser(SA_PARAM, a!.sa);
  poser(REF_PARAM, a!.ref);

  const absolue = !!schema || brut.startsWith("//");
  return absolue ? u.toString() : `${u.pathname}${u.search}${u.hash}`;
}

/**
 * Relit un affilié mis de côté pendant la visite (sessionStorage).
 *
 * PURE. Repasse par les MÊMES lecteurs que l'URL : sans ça, un champ
 * enregistré à `null` revient en chaîne `"null"`, qui a exactement la
 * forme d'un code public valide (quatre lettres minuscules). On
 * attribuerait alors les leads à un affilié nommé "null", et personne
 * ne verrait rien avant de chercher pourquoi un versement part dans le
 * vide.
 */
export function lireAffiliateEnregistre(brut: string | null | undefined): AffiliateDuQuiz {
  if (!brut) return AFFILIATE_VIDE;
  try {
    return lireAffiliateObjet(JSON.parse(String(brut)));
  } catch {
    return AFFILIATE_VIDE;
  }
}

/**
 * Relit un affilié reçu dans un corps de requête.
 *
 * PURE. Le serveur ne fait JAMAIS confiance à ce que le navigateur lui
 * envoie : ces valeurs finissent dans une colonne et sur la fiche
 * contact du vendeur, donc elles repassent par les mêmes lecteurs que
 * l'URL, exactement comme au premier passage.
 */
export function lireAffiliateObjet(valeur: unknown): AffiliateDuQuiz {
  if (!valeur || typeof valeur !== "object" || Array.isArray(valeur)) return AFFILIATE_VIDE;
  const objet = valeur as Record<string, unknown>;
  return {
    sa: readSa(objet.sa),
    ref: readRef(objet.ref),
    canal: lireCanalBrut(typeof objet.canal === "string" ? objet.canal : null),
  };
}

/**
 * Le tag montrée dans les statistiques du quiz.
 *
 * Le canal passe DEVANT le code : quand l'affilié a pris la peine
 * d'écrire `?c=youtube`, c'est cette réponse là qu'il est venu chercher.
 * Sans rien, on dit "sans affilié" plutôt que de laisser une case vide,
 * qui se lit comme une donnée manquante alors que c'est une information.
 */
export function etiquetteSource(
  a: AffiliateDuQuiz | null | undefined,
  sansAffilie: string,
): string {
  if (!a) return sansAffilie;
  if (a.canal) return a.canal;
  return a.ref || a.sa || sansAffilie;
}
