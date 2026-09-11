// lib/affiliate/filetCommission.ts
//
// UNE COMMISSION QUE TIPOTE N'A PAS PRISE N'EST PAS PERDUE : ELLE ATTEND.
//
// Audit du 11 septembre 2026, à la question de Béné "est-ce que je peux
// envoyer mes affiliés dessus sans risque ?". Le trou le plus cher de
// toute la chaîne : `commissionnerVente` tourne DANS le webhook de
// paiement, et un échec de l'appel vers Tipote (panne, déploiement,
// secret manquant, délai dépassé) était journalisé puis OUBLIÉ. Le
// webhook répondait 200, donc le fournisseur ne rejouait rien, et
// l'affilié n'était pas payé sans qu'un seul écran le dise.
//
// Ce module est PUR : il décide, il n'écrit rien. `filetCommissionStore`
// écrit, `posterTipote` parle au réseau. Les décisions vivent ici pour
// être testables (règle du 1er août) : une règle enfermée dans un module
// qui importe `supabaseAdmin` n'est pas testée.

export type ActionCommission = "attribuer" | "annuler";

/**
 * Ce que le rejeu voit d'une ligne en attente. `tentatives` compte
 * l'appel d'origine : une ligne fraîche en porte une.
 */
export interface LigneEnAttente {
  cle: string;
  action: ActionCommission;
  corps: unknown;
  tentatives: number;
  rejouable: boolean;
  derniere_tentative: string;
  envoye_le: string | null;
}

/**
 * Le délai minimum entre deux essais sur la même ligne. Dix minutes :
 * assez pour qu'un déploiement de Tipote se termine, assez court pour
 * qu'une commission n'attende pas une journée derrière une panne d'une
 * minute.
 */
export const REJEU_APRES_MS = 10 * 60 * 1000;

/**
 * Au delà, on arrête d'essayer TOUT SEUL et la ligne reste visible pour
 * un humain. 500 essais espacés de dix minutes font plus de trois
 * jours de panne continue : à ce stade ce n'est plus un incident, c'est
 * une configuration à revoir, et rejouer en boucle n'y changerait rien.
 */
export const MAX_TENTATIVES = 500;

export interface ClasseEchec {
  /** Rejouer plus tard peut réussir sans changer le corps. */
  rejouable: boolean;
  motif: "reseau" | "corps_refuse" | "acces_refuse" | "indisponible" | "inconnu";
}

/**
 * Ce qu'un échec de l'appel veut dire, et s'il vaut la peine d'être
 * rejoué tel quel.
 *
 * - pas de statut : le réseau a lâché (délai, DNS, connexion) : rejouer ;
 * - 400 : Tipote a REFUSÉ LE CORPS. Le rejouer identique échouera
 *   pareil ; la ligne reste, mais un humain doit la lire ;
 * - 401 / 403 : le secret ne correspond pas. Ça se corrige dans un
 *   `.env`, et le même corps passera ensuite : rejouable ;
 * - 404 / 409 / 429 / 5xx : Tipote n'est pas prêt (mauvaise adresse en
 *   cours de déploiement, verrou, débit, panne) : rejouable.
 */
export function classerEchec(statut: number | null): ClasseEchec {
  if (statut == null) return { rejouable: true, motif: "reseau" };
  if (statut === 400) return { rejouable: false, motif: "corps_refuse" };
  if (statut === 401 || statut === 403) return { rejouable: true, motif: "acces_refuse" };
  if (statut === 404 || statut === 409 || statut === 429 || statut >= 500) {
    return { rejouable: true, motif: "indisponible" };
  }
  return { rejouable: true, motif: "inconnu" };
}

/**
 * Faut-il réessayer cette ligne MAINTENANT ?
 *
 * `maintenant` est un paramètre : un test qui dépend de l'horloge
 * clignote. Une date de dernière tentative illisible compte comme
 * "il y a longtemps" : ne pas rejouer parce qu'on n'a pas su lire une
 * date perdrait la commission pour une raison qui n'a rien à voir.
 */
export function doitRejouer(ligne: LigneEnAttente, maintenant: Date): boolean {
  if (ligne.envoye_le) return false;
  if (!ligne.rejouable) return false;
  if (ligne.tentatives >= MAX_TENTATIVES) return false;
  const derniere = Date.parse(ligne.derniere_tentative);
  if (!Number.isFinite(derniere)) return true;
  return maintenant.getTime() - derniere >= REJEU_APRES_MS;
}

/**
 * La clé d'une ligne en attente : l'action ET la référence de la
 * commission chez Tipote. Une attribution et son annulation sur la même
 * vente sont deux lignes, jamais une qui écrase l'autre.
 */
export function cleEnAttente(action: ActionCommission, reference: string): string {
  return `${action}:${reference}`;
}

/**
 * L'alerte ne part qu'à la PREMIÈRE mise en attente d'une ligne. Une
 * panne d'une heure sur cinquante ventes ferait sinon cinquante emails,
 * puis cinquante de plus toutes les dix minutes, et Béné cesserait de
 * les lire : c'est le filet genre-neutre du 24 août, une alerte qui
 * crie pour rien finit ignorée.
 */
export function alerterALaMiseEnAttente(tentativesApresEcriture: number): boolean {
  return tentativesApresEcriture === 1;
}
