// lib/affiliate/accueilParrain.ts
//
// « JOCELYNE TE PROPOSE DE TESTER TIQUIZ » (Béné, 27 août 2026).
//
// "Par exemple si lien affilié : Jocelyne te propose de tester Tiquiz
// gratuitement alors n'hésite pas ! En plus grâce à son lien tu
// profiteras d'un mois gratuit à l'abonnement de ton choix."
//
// Quelqu'un qui arrive par le lien d'une affiliée n'arrive pas par
// hasard : on lui a parlé de Tiquiz, il clique, et il tombait jusqu'ici
// sur un formulaire nu qui ne disait rien de tout ça. Nommer la
// personne qui l'envoie, c'est reprendre la conversation là où elle
// s'est arrêtée.
//
// -- ON N'ANNONCE QUE CE QUE LE CODE HONORERA VRAIMENT ----------------
//
// C'est la seule règle qui compte ici, et elle décide de tout le reste.
// Le mois offert est REFUSÉ par `essaiPourCeCheckout` quand l'affiliée
// est inconnue, en pause ou exclue. Un bandeau qui le promettrait quand
// même enverrait le visiteur payer plein tarif après lui avoir dit
// l'inverse : c'est pire que ne rien annoncer, parce que la déception
// arrive au moment de sortir la carte.
//
// D'où les quatre silences, tous volontaires :
//
//   - pas de code dans l'URL : il n'y a personne à nommer ;
//   - Tipote n'a pas répondu (`connu: false`) : on ne sait pas, et on
//     ne fait pas de promesse sur ce qu'on ne sait pas. Le cadeau suit
//     exactement la même règle depuis le 23 août ;
//   - le code n'existe pas : quelqu'un a tapé n'importe quoi ;
//   - l'affiliée n'est pas active : elle ne commissionne plus, donc la
//     citer serait faire sa promotion sans qu'elle soit payée.
//
// Dans ces quatre cas l'écran garde son formulaire normal. Personne ne
// perd rien, et surtout personne ne lit une promesse qui ne tiendra pas.

import { JOURS_MOIS_OFFERT_ANNONCE } from "@/lib/trial/moisOffert";
import { prenomPublic } from "@/lib/affiliate/nomPublic";

export type Parrainage =
  | { affiche: false }
  | {
      affiche: true;
      /** Son prénom, ou `null` : l'écran dit alors "un partenaire Tiquiz". */
      prenom: string | null;
      /** Le nombre de jours ANNONCÉ, pris à la source du checkout. */
      joursOfferts: number;
    };

const RIEN: Parrainage = { affiche: false };

/**
 * Ce que la page d'inscription doit dire du lien qui a amené le visiteur.
 *
 * Les cinq entrées sont OBLIGATOIRES. `connu` et `actif` se ressemblent
 * et ne veulent pas dire la même chose ("je n'ai pas pu regarder" contre
 * "j'ai regardé, elle est en pause") : les confondre ferait taire un
 * bandeau légitime, ou pire, en afficherait un sur une affiliée exclue.
 * C'est la distinction qui a été écrite le 23 août pour le mois offert,
 * et elle vaut ici pour la même raison.
 *
 * Le nombre de jours n'est PAS un paramètre : il vient de la constante
 * que lit le checkout. Deux nombres écrits séparément finissent toujours
 * par diverger, et celui-là serait lu par le visiteur avant de payer.
 */
export function readParrainage(args: {
  ref: string | null | undefined;
  connu: boolean;
  existe: boolean;
  actif: boolean;
  nomPublic: string | null | undefined;
}): Parrainage {
  if (!String(args.ref ?? "").trim()) return RIEN;
  if (!args.connu) return RIEN;
  if (!args.existe) return RIEN;
  if (!args.actif) return RIEN;

  return {
    affiche: true,
    prenom: prenomPublic(args.nomPublic),
    joursOfferts: JOURS_MOIS_OFFERT_ANNONCE,
  };
}
