// lib/site/programmeAffiliation.ts
//
// LES CHIFFRES DU PROGRAMME D'AFFILIATION, CALCULÉS ET NON TAPÉS.
//
// Béné, 30 août 2026 : "il faut tout mettre à jour, les prix, le
// fonctionnement qui bascule de systeme io vers notre propre serveur,
// le nouveau programme d'affi sur tiquiz et l'atelier."
//
// -- POURQUOI UN MODULE, ET PAS DES NOMBRES DANS LE JSX ----------------
//
// Sa ligne rouge numéro un, c'est le chiffre faux. Une page de vente
// qui annonce "5,67 € par mois" en dur continue de l'annoncer le jour
// où le prix de Tiquiz change, et personne ne s'en aperçoit avant
// qu'un affilié ne compte son versement. Les exemples sont donc
// DÉRIVÉS du catalogue (`lib/checkout/catalog.ts`), qui est déjà la
// seule source des prix affichés sur le bon de commande.
//
// -- LES TAUX VIVENT DANS TIPOTE, ET C'EST ASSUMÉ ----------------------
//
// `COMMISSION_RATES` est dans `lib/affiliate/commission.ts` du dépôt
// Tipote, qui est celui qui PAIE. Ce dépôt ne fait que vendre. Les
// recopier ici est une duplication, et une duplication finit toujours
// par diverger : le test `programme-affiliation.test.mts` fige donc les
// valeurs, et tout changement de taux doit être porté DES DEUX CÔTÉS.
// Mieux vaut une duplication qui crie qu'une page qui ment.

import { OWNER_CATALOG, formatCents, type OwnerProductId } from "@/lib/checkout/catalog";
import { LANGUE_SANS_PREFIXE, type LanguePublique } from "@/lib/site/langues";

/**
 * LA LANGUE DÉCIDE AUSSI DU FORMAT DES NOMBRES.
 *
 * `formatCents` prend un identifiant BCP-47, pas une langue publique :
 * en français un prix s'écrit `5,67 €`, en anglais `€5.67`. Passer la
 * langue et laisser cette table faire la traduction évite qu'un
 * appelant écrive `"en"` là où `Intl` attend `"en-US"` et retombe sur
 * un format qu'il n'a pas choisi.
 */
const LOCALE_DES_NOMBRES: Record<LanguePublique, string> = {
  fr: "fr-FR",
  en: "en-US",
};

/**
 * Les taux, tels que `lib/affiliate/commission.ts` (Tipote) les applique.
 * Vérifiés dans le code le 30 août 2026, pas déduits d'une page.
 */
export const TAUX = {
  tiquiz: 0.4,
  atelier: 0.7,
} as const;

/** Le prix public de l'Atelier du Quiz, en centimes. */
export const PRIX_ATELIER_CENTS = 4700;

/**
 * LE TAUX DE TVA RETENU POUR PASSER DU PRIX AFFICHÉ AU MONTANT HT.
 *
 * La commission Tiquiz se calcule sur le HT : `commissionBaseCents`
 * retire la TVA avant d'envoyer la vente à Tipote, avec `base: "ht"`.
 * Annoncer une commission calculée sur le TTC gonflerait l'exemple de
 * 20 %, et l'affilié verrait la différence sur son premier versement.
 */
export const TVA = 0.2;

/** Le montant hors taxes d'un prix affiché. */
export function horsTaxes(ttcCents: number): number {
  return Math.round(ttcCents / (1 + TVA));
}

/** Ce que rapporte UNE vente de ce palier, à chaque échéance. */
export function commissionCents(produit: OwnerProductId): number {
  return Math.round(horsTaxes(OWNER_CATALOG[produit].amountCents) * TAUX.tiquiz);
}

/**
 * "PLUS" EN CAPITALES, C'EST SA CONVENTION DE MARQUE.
 *
 * Le catalogue écrit "Tiquiz mensuel Plus" : ce libellé sert aussi le
 * bon de commande et les factures, on n'y touche pas depuis ici. La
 * mise en forme de marque est une décision d'AFFICHAGE, elle vit donc
 * dans la fonction qui affiche.
 */
function libellePublic(label: string): string {
  return label.replace(/\bPlus\b/g, "PLUS");
}

export interface LigneGain {
  palier: string;
  /** Le prix payé par le client, tel qu'affiché sur le bon de commande. */
  prix: string;
  /** Ce que touche l'affilié, à chaque échéance. */
  gain: string;
  /** "par mois" ou "par an", pour que personne ne confonde les deux. */
  rythme: string;
}

/**
 * Le tableau des gains, dans l'ordre du catalogue.
 *
 * `rythme` n'est pas décoratif : 56,67 € sur l'annuel et 5,67 € sur le
 * mensuel ne se comparent pas, et une colonne qui les mettrait côte à
 * côte sans le dire ferait croire que l'annuel rapporte dix fois plus.
 */
export function tableauDesGains(langue: LanguePublique = LANGUE_SANS_PREFIXE): LigneGain[] {
  const locale = LOCALE_DES_NOMBRES[langue];
  const rythmes = RYTHMES[langue];
  return (Object.keys(OWNER_CATALOG) as OwnerProductId[]).map((id) => ({
    // LE NOM DU PALIER NE SE TRADUIT PAS : "Tiquiz mensuel PLUS" est le
    // libellé du catalogue, celui du bon de commande et des factures.
    // Le traduire ferait lire un nom de produit qui n'existe nulle part
    // ailleurs, et il faudrait le chercher pour le reconnaître.
    palier: libellePublic(OWNER_CATALOG[id].label),
    prix: formatCents(OWNER_CATALOG[id].amountCents, OWNER_CATALOG[id].currency, locale),
    gain: formatCents(commissionCents(id), OWNER_CATALOG[id].currency, locale),
    rythme: rythmes[id],
  }));
}

/**
 * "chaque mois" ou "chaque année", par langue.
 *
 * C'est la seule chaîne du tableau qui se traduit, et elle n'est pas
 * décorative : 56,67 € par an et 5,67 € par mois ne se comparent pas.
 * Un `Record` sur les quatre paliers, donc en oublier un ne compile pas.
 */
const RYTHMES: Record<LanguePublique, Record<OwnerProductId, string>> = {
  fr: {
    mensuel: "chaque mois",
    "mensuel-plus": "chaque mois",
    annuel: "chaque année",
    "annuel-plus": "chaque année",
  },
  en: {
    mensuel: "every month",
    "mensuel-plus": "every month",
    annuel: "every year",
    "annuel-plus": "every year",
  },
};

/**
 * Ce que rapporte une vente de l'Atelier du Quiz.
 *
 * SUR LE HORS TAXES, comme Tiquiz. Le premier jet calculait 70 % du
 * TTC, soit 32,90 €, et c'était faux : sa propre page d'affiliation
 * annonce 27,42 €, qui est bien 70 % du HT (47 / 1,2 x 0,7). Annoncer
 * un montant plus élevé que celui qui sera versé est la pire erreur
 * possible sur une page d'affiliation : l'affilié le découvre à son
 * premier virement.
 */
export function gainAtelier(
  langue: LanguePublique = LANGUE_SANS_PREFIXE,
): { prix: string; gain: string } {
  const locale = LOCALE_DES_NOMBRES[langue];
  return {
    prix: formatCents(PRIX_ATELIER_CENTS, "eur", locale),
    gain: formatCents(Math.round(horsTaxes(PRIX_ATELIER_CENTS) * TAUX.atelier), "eur", locale),
  };
}

/**
 * LES RÈGLES DU PROGRAMME, DANS LEUR FORMULATION PUBLIQUE.
 *
 * Chacune correspond à une constante du code, citée à côté : c'est ce
 * qui permet de vérifier qu'on n'annonce rien qui ne soit implémenté.
 * Béné, 26 août : "je dois être sûre que tu as bien tout compris et
 * pris en compte avant d'envoyer le moindre code."
 */
export interface RegleProgramme {
  titre: string;
  texte: string;
}

export const REGLES: readonly RegleProgramme[] = [
  {
    titre: "Le cookie dure 1 an",
    texte:
      "Quelqu'un clique sur ton lien en janvier, il achète en juin : la vente est à toi. C'est REF_MAX_AGE_SECONDS, et c'est la même durée que chez Systeme.io.",
  },
  {
    titre: "Une inscription gratuite te le rattache à vie",
    texte:
      "S'il crée un compte gratuit par ton lien, il reste ton filleul même s'il paie deux ans plus tard, cookie expiré ou pas. Et c'est le PREMIER rattachement qui gagne, jamais le dernier : un contact appartient à celui qui l'a amené.",
  },
  {
    titre: "Tu es payé à chaque échéance",
    texte:
      "Pas une fois. Chaque mois où ton filleul reste abonné, tu touches ta commission. S'il arrête, ça s'arrête, c'est tout.",
  },
  {
    titre: "Versable 30 jours après le paiement",
    texte:
      "Le temps que le délai de remboursement passe. Un virement parti ne se reprend pas, donc on attend d'être sûr.",
  },
  {
    titre: "Virement entre le 10 et le 13 du mois",
    texte:
      "Dès 20 € accumulés (Systeme.io demandait 50 €). En dessous, l'argent reste acquis et part au versement suivant : rien ne se perd.",
  },
  {
    titre: "Ta facture, on l'écrit pour toi",
    texte:
      "Tu remplis tes coordonnées et ton statut une fois, et on émet l'autofacture chaque mois pour ta compta. Tu n'as rien à nous envoyer.",
  },
  {
    titre: "PayPal ou virement, au choix",
    texte:
      "Ton adresse PayPal ou ton IBAN, dans ton espace affilié. L'IBAN est chiffré et ne ressort jamais en clair, même pour toi : tu vois un masque, tu le ressaisis pour le changer.",
  },
  {
    titre: "Un remboursement annule la commission",
    texte:
      "Uniquement l'échéance remboursée. Les mois déjà encaissés sont gagnés et restent acquis.",
  },
] as const;

/**
 * LES MÊMES HUIT RÈGLES, EN ANGLAIS.
 *
 * Ce ne sont PAS des traductions mot pour mot : "tu es payé à chaque
 * échéance" devient "you get paid on every renewal", et le nom des
 * constantes du code (`REF_MAX_AGE_SECONDS`) ne bouge pas, puisque
 * c'est le nom d'une chose et pas une phrase.
 *
 * LES MONTANTS RESTENT DANS LEUR DEVISE ET NE SE CONVERTISSENT PAS :
 * le seuil de versement est de 20 €, celui de Systeme.io de 50 €, et
 * un affilié anglophone est payé en euros comme les autres. Écrire un
 * montant en dollars ici annoncerait un versement qui n'aura pas lieu.
 *
 * `Record<Exclude<LanguePublique, typeof LANGUE_SANS_PREFIXE>, ...>` :
 * une langue publique ajoutée sans ses règles ne compile pas, donc elle
 * ne peut pas servir du français sous une adresse anglaise.
 */
const REGLES_TRADUITES: Readonly<
  Record<Exclude<LanguePublique, typeof LANGUE_SANS_PREFIXE>, readonly RegleProgramme[]>
> = {
  en: [
    {
      titre: "The cookie lasts a full year",
      texte:
        "Someone clicks your link in January and buys in June: the sale is yours. That is REF_MAX_AGE_SECONDS, and it is the same window Systeme.io gave you.",
    },
    {
      titre: "A free signup ties them to you for life",
      texte:
        "If they open a free account through your link, they stay your referral even if they pay two years later, cookie expired or not. And the FIRST attribution wins, never the last: a contact belongs to whoever brought them in.",
    },
    {
      titre: "You get paid on every renewal",
      texte:
        "Not once. Every month your referral stays subscribed, you earn your commission. The day they leave, it stops, and that is that.",
    },
    {
      titre: "Payable 30 days after the payment",
      texte:
        "Long enough for the refund window to close. A transfer that has left cannot be taken back, so we wait until we are sure.",
    },
    {
      titre: "Paid out between the 10th and the 13th",
      texte:
        "As soon as you have 20 € waiting (Systeme.io asked for 50 €). Below that, the money is still yours and rolls into the next payout: nothing is lost.",
    },
    {
      titre: "We write your invoice for you",
      texte:
        "You fill in your details and your tax status once, and we issue the self-billed invoice every month for your accounts. You have nothing to send us.",
    },
    {
      titre: "PayPal or bank transfer, your call",
      texte:
        "Your PayPal address or your IBAN, in your affiliate area. The IBAN is encrypted and never comes back out in the clear, not even for you: you see a mask, and you retype it to change it.",
    },
    {
      titre: "A refund cancels that commission",
      texte:
        "Only the renewal that was refunded. The months already collected were earned, and they stay yours.",
    },
  ],
};

/** Les règles du programme, dans la langue demandée. */
export function reglesPourLangue(
  langue: LanguePublique = LANGUE_SANS_PREFIXE,
): readonly RegleProgramme[] {
  return langue === LANGUE_SANS_PREFIXE ? REGLES : REGLES_TRADUITES[langue];
}
