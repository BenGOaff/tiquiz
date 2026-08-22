// lib/admin/webhookRows.ts
//
// CE QU'UN APPEL REÇU A VRAIMENT FAIT, ET S'IL FAUT LE REGARDER.
//
// -- LE DÉFAUT QUE CET ÉCRAN AVAIT (22 août 2026) ----------------------
//
// Le journal des appels affichait "non reconnu" en ROUGE sur des optins
// gratuits qui avaient parfaitement marché, et gardait un badge "1 sans
// accès ouvert" sur une vente corrigée depuis deux semaines.
//
// Les deux fautes sont la MÊME, et c'est celle du quiz scoré du 1er
// août : **une analyse écrite pour une mécanique, appliquée telle quelle
// à une autre.**
//
//   - Un optin gratuit n'arrive PAS par le même chemin qu'une vente. Il
//     entre par `/api/systeme-io/free-optin`, source
//     `systeme_io_free_optin`, et ce chemin ne consulte JAMAIS la table
//     de routage : il crée un compte gratuit, point. Lui reprocher que
//     son tunnel n'est pas dans `URL_TO_PLAN` n'a aucun sens.
//   - Un `refused` est daté. Si la table de routage a été complétée
//     depuis (le cas d'Ivan, 7 août), la ligne raconte un problème qui
//     n'existe plus. Une alerte qui reste rouge après la correction est
//     une alerte qu'on apprend à ne plus lire, et c'est comme ça qu'on
//     rate la suivante.
//
// **La mécanique est donc un PARAMÈTRE** (`readCallKind`), jamais devinée
// à l'intérieur du verdict.
//
// -- LE SERVEUR REND UN CODE, L'ÉCRAN ÉCRIT LA PHRASE ------------------
//
// Même règle que la suppression d'un quiz (3 août) et l'import PDF
// (7 août). Ici c'est un écran interne en français, mais la règle tient
// pour une autre raison : la phrase changera dix fois, le code non, et
// c'est le code que le test fige.

/** Par quel chemin l'appel est entré. */
export type CallKind =
  /** Vente Systeme.io : la table de routage décide du palier. */
  | "sale"
  /** Optin gratuit Systeme.io : compte gratuit, aucun routage consulté. */
  | "free_optin"
  /** Notre propre encaissement (Stripe, PayPal). */
  | "owner"
  | "unknown";

/**
 * Ce que la ligne raconte.
 *
 * Un seul de ces codes est ROUGE (`sans-acces`) : c'est le seul cas où
 * quelqu'un attend quelque chose qu'il n'a pas.
 */
export type CallVerdict =
  /** L'accès est ouvert, rien à faire. */
  | "ouvert"
  /** L'accès est ouvert, mais le palier vient d'un repli : à confirmer. */
  | "palier-a-confirmer"
  /** Refusé, et le routage d'AUJOURD'HUI ne sait toujours pas répondre. */
  | "sans-acces"
  /** Refusé à l'époque, mais le routage d'aujourd'hui saurait répondre. */
  | "corrige-depuis"
  /** Le paiement a échoué chez Systeme.io. Ce n'est pas une panne chez nous. */
  | "paiement-echoue"
  /** Une vraie erreur de notre côté. */
  | "panne"
  /** Rien à dire : cet appel ne passe pas par le routage. */
  | "sans-objet";

export interface CallRow {
  source: string | null;
  eventType: string | null;
  status: string | null;
  error: string | null;
  /** Ce que la table de routage répondrait AUJOURD'HUI. */
  planNow: string | null;
}

/**
 * Par quel chemin cet appel est entré.
 *
 * C'est `source` qui tranche, jamais le type d'événement : deux routes
 * différentes peuvent écrire le même `event_type`, et c'est la ROUTE qui
 * détermine ce qui a été consulté.
 */
export function readCallKind(source: string | null | undefined): CallKind {
  const s = String(source ?? "").trim().toLowerCase();
  if (s === "systeme_io_free_optin") return "free_optin";
  if (s === "systeme_io") return "sale";
  if (s === "stripe" || s === "paypal") return "owner";
  return "unknown";
}

/**
 * La table de routage veut-elle dire quelque chose sur cette ligne ?
 *
 * Non sur un optin gratuit et non sur nos propres ventes : afficher
 * "non reconnu" y serait un reproche adressé à un mécanisme qui n'a
 * jamais été appelé.
 */
export function routageConcerne(kind: CallKind): boolean {
  return kind === "sale";
}

/** Un type d'événement qui dit "la carte du client a été refusée". */
export function estEchecDePaiement(eventType: string | null | undefined): boolean {
  return /PAYMENT[._]?FAILED|PAIEMENT[._]?ECHOUE/i.test(String(eventType ?? ""));
}

/**
 * Le verdict d'une ligne.
 *
 * `planNow` est le seul élément qui rende la ligne PÉRIMABLE : c'est lui
 * qui fait passer un ancien refus de "sans accès" à "corrigé depuis",
 * sans qu'on ait à retoucher la ligne en base.
 */
export function readCallVerdict(row: CallRow): CallVerdict {
  const kind = readCallKind(row.source);
  const status = String(row.status ?? "").trim().toLowerCase();

  if (status === "error") return "panne";
  if (status === "transient_failure" || estEchecDePaiement(row.eventType)) {
    return "paiement-echoue";
  }

  if (!routageConcerne(kind)) {
    // Optin gratuit ou vente à nous : le compte a été créé (ou l'argent
    // encaissé) par un chemin qui ne consulte pas la table de routage.
    return "sans-objet";
  }

  if (status === "refused") {
    return row.planNow ? "corrige-depuis" : "sans-acces";
  }
  if (status === "granted_fallback") return "palier-a-confirmer";
  return "ouvert";
}

/**
 * Faut-il AGIR sur cette ligne ?
 *
 * Uniquement quand quelqu'un attend quelque chose qu'il n'a pas, ou
 * quand on a planté. Un paiement refusé chez Systeme.io ne demande rien
 * de nous, et un ancien refus déjà couvert par la table d'aujourd'hui
 * non plus.
 */
export function demandeUneAction(verdict: CallVerdict): boolean {
  return verdict === "sans-acces" || verdict === "panne";
}

/** Combien de lignes demandent vraiment une action. */
export function compterActions(rows: readonly CallRow[]): number {
  return rows.reduce((n, r) => n + (demandeUneAction(readCallVerdict(r)) ? 1 : 0), 0);
}

// ---------------------------------------------------------------------
// OÙ EST LE MONTANT DANS LE PAYLOAD ?
// ---------------------------------------------------------------------
//
// Le tableau de bord affiche 0,00 € sur des dizaines de ventes réelles :
// aucun des chemins qu'on interroge ne trouve le montant dans ce que
// Systeme.io envoie vraiment.
//
// La tentation est d'ajouter des chemins au flair. C'est exactement
// l'erreur du drame Ivan, écrite noir sur blanc dans AGENTS.md :
// "raisonner sur la forme SUPPOSÉE d'un payload au lieu de la regarder.
// Un journal se lit, il ne se déduit pas."
//
// Le payload EST en base. On le fait donc parler : cette fonction liste
// les valeurs numériques qu'il porte, avec leur chemin. L'écran les
// montre sur les ventes dont le montant manque, et le bon chemin se lit
// au lieu de se deviner.
//
// Elle ne rend QUE des nombres : jamais une adresse, jamais un nom.

export interface ChampNumerique {
  chemin: string;
  valeur: number;
}

/** Une valeur qui pourrait être un montant. Les booléens n'en sont pas. */
function nombreEventuel(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const t = v.trim();
    if (!t || !/^-?\d+([.,]\d+)?$/.test(t)) return null;
    const n = Number(t.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Les champs numériques du payload, chemin compris.
 *
 * `max` borne la sortie : un payload Systeme.io porte des dizaines
 * d'identifiants, et une liste sans fin ne se lit pas. Les valeurs nulles
 * ou négatives sont écartées, un montant ne l'est jamais.
 */
export function champsNumeriques(payload: unknown, max = 14): ChampNumerique[] {
  const out: ChampNumerique[] = [];

  const visiter = (noeud: unknown, chemin: string, profondeur: number): void => {
    if (out.length >= max || profondeur > 6 || noeud == null) return;
    if (Array.isArray(noeud)) {
      noeud.forEach((v, i) => visiter(v, `${chemin}[${i}]`, profondeur + 1));
      return;
    }
    if (typeof noeud === "object") {
      for (const [k, v] of Object.entries(noeud as Record<string, unknown>)) {
        visiter(v, chemin ? `${chemin}.${k}` : k, profondeur + 1);
        if (out.length >= max) return;
      }
      return;
    }
    const n = nombreEventuel(noeud);
    if (n != null && n > 0) out.push({ chemin, valeur: n });
  };

  visiter(payload, "", 0);
  return out;
}
