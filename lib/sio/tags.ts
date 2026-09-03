// lib/sio/tags.ts
//
// LES MÊMES TAGS, QUE LE CLIENT PAIE CHEZ SYSTEME.IO OU CHEZ NOUS.
//
// Béné, 22 août : "oui pourquoi pas un contrôle des tags, et on utilise
// les mêmes pour ceux qui vont payer via notre système comme ça je ne
// suis pas perdue."
//
// C'est la bonne décision, et elle vaut plus que du confort. Aujourd'hui
// ses automatisations, ses séquences d'emails et ses segments sont
// construits sur ces tags. Le jour où un client paie par NOTRE bon de
// commande, s'il n'est pas taggé comme les autres, il sort de tous
// ses scénarios sans que rien ne le signale.
//
// -- RELEVÉ DANS SON COMPTE, PAS INVENTÉ -------------------------------
//
// Les noms ci dessous ont été LUS dans son compte Systeme.io le 22 août
// 2026. Un tag inventé serait créé en double à la première vente, et sa
// liste de contacts porterait deux tags qui veulent dire la même
// chose : exactement le genre de dégât silencieux qu'on ne remarque que
// trois mois plus tard, en se demandant pourquoi une séquence ne part
// plus.
//
// -- CE QUI MANQUE POUR S'EN SERVIR ------------------------------------
//
// Une clé d'API Systeme.io sur le serveur. Sans elle, rien n'est posé et
// rien ne casse : `readSioTag` reste une fonction pure, et l'appelant
// décide quoi faire de `null`. Un accès ouvert ne doit JAMAIS dépendre
// d'un tag qui n'a pas pu partir.

import type { TiquizPlan } from "./webhookInference";

/**
 * Le tag Systeme.io de chaque palier Tiquiz.
 *
 * Relevé le 22 août 2026. Les variantes `-us` existent aussi dans son
 * compte (`tiquiz-mensuel-us`...) : elles ne sont PAS ici parce que rien
 * dans nos données ne dit aujourd'hui qu'une vente est américaine. Les
 * poser au flair tagrait des clients français en `-us`.
 */
export const PLAN_TO_TAG: Record<TiquizPlan, string> = {
  free: "tiquiz-free",
  monthly: "tiquiz-mensuel",
  yearly: "tiquiz-annuel",
  monthly_plus: "tiquiz-mensuel-plus",
  yearly_plus: "tiquiz-annuel-plus",
  lifetime: "tiquiz-beta",
  beta: "tiquiz-beta",
};

/**
 * TOUS les tags Tiquiz de son compte, y compris ceux qu'on ne pose pas.
 *
 * Sert au CONTRÔLE : pour comparer "qui est marqué payant chez
 * Systeme.io" à "qui est payant chez nous", il faut connaître les
 * tags qu'on ne pose pas soi même.
 */
export const TAGS_TIQUIZ = [
  "tiquiz-free",
  "tiquiz-mensuel",
  "tiquiz-annuel",
  "tiquiz-mensuel-plus",
  "tiquiz-annuel-plus",
  "tiquiz-beta",
  "tiquiz-affilié",
  "tiquiz-visiteur",
  "tiquiz-ebook",
  "tiquiz-free-us",
  "tiquiz-mensuel-us",
  "tiquiz-annuel-us",
  "tiquiz-beta-us",
  "tiquiz-affilié-us",
] as const;

/**
 * LE TAG COMMUN À TOUS CEUX QUI ONT PAYÉ CHEZ NOUS.
 *
 * Béné, 1er septembre 2026 : "il faut que tu ajoutes le tag
 * tiquiz-clients pour faire partir la campagne tiquiz abonnement à
 * chaque vente sur notre système."
 *
 * Son workflow est déjà en place : *Tag "tiquiz-clients" ajouté ->
 * S'abonner à la campagne "Tiquiz abonnement"*. Sans ce tag, un client
 * qui paie sur NOTRE bon de commande porte bien son palier
 * (`tiquiz-mensuel`...) mais n'entre dans AUCUNE séquence, et rien ne le
 * signale : c'est le trou d'Ivan (7 août) déplacé d'un cran.
 *
 * RELEVÉ dans son compte le 1er septembre 2026, pas inventé : le tag
 * existe (créé le jour même). La règle du 22 août tient toujours, on ne
 * CRÉE jamais un tag : `poserTagParNom` répond `tag_inconnu` et on le
 * lit dans le journal plutôt que de fabriquer un doublon.
 */
export const TAG_CLIENT_TIQUIZ = "tiquiz-clients";

/**
 * Le tag "client" à poser EN PLUS du palier, ou `null`.
 *
 * **Il s'AJOUTE, il ne remplace pas.** Ses segments et ses filtres sont
 * bâtis sur le palier (`tiquiz-mensuel`, `tiquiz-annuel-plus`...) :
 * poser `tiquiz-clients` à la place les viderait tous d'un coup.
 *
 * **`free` en est exclu, et c'est la seule règle.** Une inscription
 * gratuite a déjà SA campagne, déclenchée par `tiquiz-free` (vérifié
 * par Béné dans son tableau de bord le 1er septembre). Marquer un
 * inscrit gratuit comme client l'enverrait dans la séquence
 * d'abonnement de quelqu'un qui n'a rien payé, et fausserait le seul
 * segment qui compte pour ses relances.
 *
 * Tous les autres paliers en sont, `beta` et `lifetime` compris : le
 * tag dit "cette personne a payé", pas "cette personne se réabonne
 * tous les mois".
 */
export function readSioClientTag(plan: string | null | undefined): string | null {
  const p = String(plan ?? "").trim().toLowerCase();
  if (!p || p === "free") return null;
  return readSioTag(p) ? TAG_CLIENT_TIQUIZ : null;
}

/** Le tag à poser pour ce palier, ou `null` si le palier est inconnu. */
export function readSioTag(plan: string | null | undefined): string | null {
  const p = String(plan ?? "").trim().toLowerCase();
  return (PLAN_TO_TAG as Record<string, string>)[p] ?? null;
}

/**
 * Le palier que ce tag annonce, ou `null`.
 *
 * L'inverse de `readSioTag`, et il sert au contrôle : un contact marqué
 * `tiquiz-mensuel` chez Systeme.io doit être `monthly` chez nous.
 *
 * Les variantes `-us` répondent le même palier : elles disent la devise
 * du bon de commande, pas ce que le client a acheté.
 */
export function readPlanFromTag(tag: string | null | undefined): TiquizPlan | null {
  const t = String(tag ?? "").trim().toLowerCase().replace(/-us$/, "");
  for (const [plan, nom] of Object.entries(PLAN_TO_TAG)) {
    if (nom === t) return plan as TiquizPlan;
  }
  return null;
}

/**
 * L'ÉCART ENTRE CE QUE DIT SYSTEME.IO ET CE QU'ON A OUVERT.
 *
 * C'est le contrôle qu'elle demande, et il aurait rattrapé Ivan le jour
 * même : il portait `tiquiz-mensuel` chez Systeme.io et `free` chez
 * nous, pendant qu'on attendait qu'il écrive.
 *
 * `null` = tout va bien. Une valeur = quelqu'un n'a pas ce qu'il a payé,
 * ou garde un accès qu'il ne paie plus.
 */
export type EcartTag =
  /** Le tag dit payant, le compte est en gratuit. C'est le cas Ivan. */
  | "acces-manquant"
  /** Le compte est payant, aucun tag payant en face. */
  | "tag-manquant"
  /** Les deux sont payants, mais pas au même palier. */
  | "palier-different";

export function comparerTagEtPlan(args: {
  /** Les tags portés par le contact chez Systeme.io. */
  tags: readonly string[];
  /** Le palier ouvert chez nous. */
  planChezNous: string | null;
}): EcartTag | null {
  const paliersTags = args.tags
    .map(readPlanFromTag)
    .filter((p): p is TiquizPlan => p != null && p !== "free");
  const chezNous = String(args.planChezNous ?? "").trim().toLowerCase();
  const payantChezNous = chezNous !== "" && chezNous !== "free";

  if (paliersTags.length === 0) {
    return payantChezNous ? "tag-manquant" : null;
  }
  if (!payantChezNous) return "acces-manquant";
  // Un client qui a changé de palier porte parfois les deux tags le
  // temps que l'ancien soit retiré : tant que l'un des deux correspond,
  // il n'y a rien à corriger.
  return paliersTags.includes(chezNous as TiquizPlan) ? null : "palier-different";
}
