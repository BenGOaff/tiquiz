// lib/ventes/verdictCommission.ts
//
// CE QUE LE REGISTRE A RÉPONDU, ET COMMENT ON LE DIT.
//
// Béné, 17 septembre 2026 : "il faut être sûre à 200 % qu'un affilié ne
// va pas perdre sa com parce que notre système aurait foiré." Puis le
// 18 : "dans l'email que je reçois, je voudrais savoir en plus si la
// vente est liée à un affilié, et si oui lequel."
//
// -- POURQUOI CE FICHIER EXISTE À PART ---------------------------------
//
// Tiquiz et l'Atelier appellent le MÊME registre
// (`/api/affiliate/attribute-sale` chez Tipote), reçoivent les MÊMES
// réponses, et doivent les dire de la MÊME façon dans la boîte de
// réception de Béné. Deux traductions séparées finiraient par diverger,
// et c'est la leçon des deux versions de `pdf-parse` (7 août) : un
// garde-fou qui ne protège qu'un des deux jumeaux ne protège personne.
//
// **CE FICHIER EST IDENTIQUE À L'OCTET PRÈS DANS LES DEUX DÉPÔTS**, comme
// `alerteVente.ts` juste à côté :
//
//     cmp lib/ventes/verdictCommission.ts ../formaquiz/lib/ventes/verdictCommission.ts
//
// PUR : pas de `server-only`, pas de `process.env`, aucune lecture de
// base. C'est ce qui le rend testable, et ce qui permet de le recopier
// sans se demander ce qu'il emporte avec lui.

import type { EtatAffiliationAlerte } from "@/lib/ventes/alerteVente";

/**
 * CE QU'EST DEVENUE LA COMMISSION DE CET ENCAISSEMENT.
 *
 * Béné, 17 septembre : "il faut être sûre à 200 % qu'un affilié ne va
 * pas perdre sa com parce que notre système aurait foiré."
 *
 * Cette garantie ne peut pas venir d'un calcul : elle vient d'une TRACE
 * par encaissement. Les statuts recopient ceux du registre de Tipote
 * (`app/api/affiliate/attribute-sale`), avec deux de plus pour ce que
 * Tipote n'a jamais vu.
 */
export type StatutCommission =
  /** Tipote a créé la commission. Un affilié est payé. */
  | "attribuee"
  /** Tipote a regardé et n'a trouvé aucun affilié. Personne n'est lésé. */
  | "aucun_affilie"
  /** Un code a été reçu, mais il ne désigne aucun affilié du registre. */
  | "affilie_inconnu"
  /** Cette vente était déjà commissionnée. Le rejeu ne paie pas deux fois. */
  | "doublon"
  /** Réglée par Systeme.io : rien à créer chez nous, et c'est normal. */
  | "reglee_ailleurs"
  /** L'appel n'est pas passé. Il est rangé pour rejeu, rien n'est perdu. */
  | "en_attente"
  /** On n'a pas pu essayer : adresse, produit ou montant manquant. */
  | "non_tentee"
  /** Tipote a répondu autre chose. À regarder à la main. */
  | "reponse_inconnue";

/**
 * Les statuts qui demandent un humain. Les autres sont des fins de
 * course légitimes.
 *
 * `en_attente` n'en fait PAS partie : le filet du 11 septembre rejoue
 * l'appel avant la maturation, donc l'argent n'est pas perdu. Il se
 * compte quand même à part sur l'écran (« en cours »), parce qu'un
 * rejeu qui ne passe jamais finirait par expirer en silence.
 */
const A_REGARDER: ReadonlySet<StatutCommission> = new Set<StatutCommission>([
  "affilie_inconnu",
  "non_tentee",
  "reponse_inconnue",
]);

export function commissionAVerifier(statut: StatutCommission | null | undefined): boolean {
  return statut == null ? true : A_REGARDER.has(statut);
}

/** Ce que Tipote a répondu, traduit une seule fois. */
export function statutDepuisTipote(reponse: string | null | undefined): StatutCommission {
  switch (String(reponse ?? "").trim()) {
    case "attributed":
      return "attribuee";
    case "no_affiliate_match":
      return "aucun_affilie";
    case "affiliate_not_registered":
      return "affilie_inconnu";
    case "duplicate":
      return "doublon";
    default:
      return "reponse_inconnue";
  }
}

export interface VerdictCommission {
  statut: StatutCommission;
  /** Ce qui a été créé, en centimes. `null` quand rien ne l'a été. */
  cents: number | null;
  /** L'affilié désigné par le registre, quand il y en a un. */
  affilie: string | null;
  /** La raison, quand elle explique un statut qui n'a rien payé. */
  detail: string | null;
  /**
   * LA BASE SUR LAQUELLE LA COMMISSION A ÉTÉ DEMANDÉE, EN CENTIMES HT.
   *
   * Optionnel, et jamais un chiffre d'affaires : c'est un justificatif.
   * Le jour où un affilié dit "je n'ai pas été payé le bon montant",
   * c'est ce nombre qui répond, sans avoir à refaire le calcul de la
   * TVA d'une vente vieille de trois mois. La commission se calcule
   * TOUJOURS sur le HT (Béné, 31 août), et l'écart de 1,13 € par vente
   * mensuelle est né précisément d'une base qu'on ne pouvait pas relire.
   */
  baseHtCents?: number | null;
}

// ── CE QU'ON EN DIT DANS L'EMAIL DE VENTE (Béné, 18 septembre 2026) ───
//
// "Dans l'email que je reçois, je voudrais savoir en plus si la vente
// est liée à un affilié, et si oui lequel."
//
// L'email a son propre vocabulaire, volontairement plus grossier
// (`lib/ventes/alerteVente.ts`) : elle le lit sur son téléphone, et ce
// qu'elle a besoin de savoir en trois secondes, c'est « quelqu'un est
// payé, personne n'est payé, ou il faut que je regarde ».
//
// LA TRADUCTION EST EXHAUSTIVE, ET C'EST TOUT L'INTÉRÊT. Pas de
// `default` : un statut nouveau fait rougir le compilateur ici, au lieu
// de tomber dans un repli qui dirait "aucun affilié" sur une commission
// qu'on n'a pas su lire. C'est le même choix que `analyzeResultCoverage`
// (1er août) : la seule protection qui survit au prochain passage.

export function etatPourAlerte(
  statut: StatutCommission | null | undefined,
): EtatAffiliationAlerte {
  // PAS DE VERDICT n'est pas "aucun affilié" : c'est "je ne sais pas",
  // et l'email doit dire la différence (c'est toute la leçon du
  // 17 septembre, transposée dans une boîte de réception).
  if (statut == null) return "inconnu";

  switch (statut) {
    case "attribuee":
      return "credite";
    case "aucun_affilie":
      return "aucun";
    case "doublon":
      // Déjà commissionnée : quelqu'un EST payé sur cet encaissement,
      // simplement pas par cet appel là.
      return "credite";
    case "reglee_ailleurs":
      return "ailleurs";
    case "en_attente":
      return "en_cours";
    case "affilie_inconnu":
    case "non_tentee":
    case "reponse_inconnue":
      return "a_regarder";
  }
}

/**
 * Le bloc `affiliation` d'un email de vente, construit depuis un verdict.
 *
 * `code` est passé MÊME quand rien n'a été crédité : un code présent sur
 * une commission absente désigne tout de suite le problème (le code
 * n'est pas au registre), alors que son absence dit l'inverse (personne
 * n'a cliqué sur un lien affilié). Les deux cas se lisent "à vérifier"
 * sans lui.
 */
export function affiliationPourAlerte(args: {
  verdict: VerdictCommission | null | undefined;
  /** Le code du lien utilisé, tel que la vente le portait. */
  code?: string | null;
  /** Le `sa` d'un ancien lien Systeme.io, à défaut du code. */
  ref?: string | null;
  /**
   * RIEN N'ÉTAIT DÛ SUR CET ENCAISSEMENT (zéro euro : mois offert, code
   * de réduction à 100 %).
   *
   * C'est un PARAMÈTRE, et il vient du point d'appel, parce que c'est
   * lui qui connaît la somme. Le déduire ici d'un verdict absent serait
   * faux : un verdict absent veut dire "je n'ai pas la trace", ce qui
   * n'a rien à voir avec "il n'y avait rien à payer". Et
   * `rien_a_devoir` n'est pas une réponse du registre : le registre n'a
   * jamais été appelé.
   */
  rienADevoir?: boolean;
}): {
  etat: EtatAffiliationAlerte;
  affilie: string | null;
  code: string | null;
  commissionCents: number | null;
  detail: string | null;
} {
  const v = args.verdict ?? null;
  return {
    // Un verdict PRÉSENT gagne toujours : si le registre a parlé, c'est
    // lui qui dit ce qui s'est passé, montant nul ou pas.
    etat: v?.statut ? etatPourAlerte(v.statut) : args.rienADevoir ? "rien_du" : "inconnu",
    affilie: v?.affilie ?? null,
    code: net(args.code) ?? net(args.ref) ?? null,
    commissionCents: v?.cents ?? null,
    detail: v?.detail ?? null,
  };
}

function net(v: string | null | undefined): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s || null;
}
