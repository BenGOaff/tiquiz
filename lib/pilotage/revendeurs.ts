// lib/pilotage/revendeurs.ts
//
// LES REVENDEURS DANS LE PILOTAGE (Béné, 29 août 2026).
//
// "Il me manque les revendeurs de Tiquiz ? Tu n'as pas pensé à les
// créer ?"
//
// Elle a raison, et l'oubli est grossier : un revendeur porte un
// PORTEFEUILLE de comptes payants et une facture tous les mois. C'est de
// l'argent qui rentre, au même titre qu'une vente, et ça n'apparaissait
// nulle part dans la console.
//
// -- LA LICENCE EST LE COMPTE PAYANT, JAMAIS LE COMPTE ----------------
//
// Un revendeur avec 300 comptes dont 40 payants a QUARANTE licences.
// Confondre les deux ferait passer le palier de commission au mauvais
// taux, donc facturerait le mauvais montant. La distinction existe déjà
// dans `lib/reseller.ts` et n'est pas réécrite ici.
//
// -- CE QUI DEMANDE UNE ACTION PASSE DEVANT ---------------------------
//
// Une facture impayée est de l'argent qui n'est pas rentré. Un
// revendeur à deux licences du palier suivant est un appel à passer. Le
// reste est du contexte.
//
// PUR : l'appelant apporte les lignes, `maintenant` est un paramètre.

export interface PalierRevendeur {
  max_active: number | null;
  rate: number;
}

export interface EntreeRevendeur {
  id: string;
  name: string | null;
  email: string | null;
  status: string | null;
  createdAt: string | null;
  clientCount: number;
  licenceCount: number;
  freeCount: number;
  currentRate: number;
  tiers: readonly PalierRevendeur[];
}

export interface EntreeFacture {
  id: string;
  resellerId: string;
  period: string | null;
  totalCents: number;
  status: string | null;
  createdAt: string | null;
  paidAt: string | null;
}

export interface LigneRevendeur extends EntreeRevendeur {
  /** Ce qui reste à encaisser chez lui. */
  impayeCents: number;
  nbImpayees: number;
  /** La dernière facture émise, quel que soit son état. */
  dernierePeriode: string | null;
  /** Encaissé chez lui depuis le début. */
  encaisseCents: number;
  /**
   * Combien de licences il lui manque pour changer de palier, et le taux
   * qu'il aurait alors. `null` quand il est déjà au dernier palier : lui
   * annoncer un objectif qui n'existe pas serait une fausse promesse.
   */
  prochainPalier: { manque: number; taux: number } | null;
}

/** Un revendeur suspendu ne compte plus, mais il ne disparaît pas. */
export function estActif(statut: string | null | undefined): boolean {
  const s = String(statut ?? "active").trim().toLowerCase();
  return s === "" || s === "active";
}

/** Une facture qui n'est pas encore payée. */
export function estImpayee(f: Pick<EntreeFacture, "status" | "paidAt">): boolean {
  if (f.paidAt) return false;
  const s = String(f.status ?? "").trim().toLowerCase();
  return s !== "paid" && s !== "cancelled" && s !== "void";
}

/**
 * LE PROCHAIN PALIER, ET CE QU'IL RAPPORTE.
 *
 * Le barème descend quand le portefeuille monte (40 % jusqu'à 200
 * licences, 35 % ensuite...). Le "prochain palier" est donc celui qui
 * commence juste au dessus du portefeuille actuel : c'est celui vers
 * lequel il va, et le seul dont l'annonce ait un sens.
 *
 * Rend `null` au dernier palier : promettre un cap qui n'existe pas est
 * pire que de ne rien promettre.
 */
export function prochainPalier(
  licences: number,
  tiers: readonly PalierRevendeur[],
): { manque: number; taux: number } | null {
  const bornes = [...(tiers ?? [])]
    .filter((t) => typeof t.max_active === "number" && (t.max_active as number) >= licences)
    .sort((a, b) => (a.max_active as number) - (b.max_active as number));
  const courant = bornes[0];
  if (!courant) return null;

  // Ce qui vient APRÈS la borne courante.
  const suivants = [...(tiers ?? [])].sort((a, b) => {
    if (a.max_active === null) return 1;
    if (b.max_active === null) return -1;
    return a.max_active - b.max_active;
  });
  const i = suivants.findIndex((t) => t.max_active === courant.max_active);
  const suivant = suivants[i + 1];
  if (!suivant) return null;

  return {
    manque: Math.max(1, (courant.max_active as number) + 1 - licences),
    taux: suivant.rate,
  };
}

/** Une ligne par revendeur, ses factures recollées. */
export function construireRevendeurs(args: {
  revendeurs: readonly EntreeRevendeur[];
  factures: readonly EntreeFacture[];
}): LigneRevendeur[] {
  const parRevendeur = new Map<string, EntreeFacture[]>();
  for (const f of args.factures) {
    const l = parRevendeur.get(f.resellerId) ?? [];
    l.push(f);
    parRevendeur.set(f.resellerId, l);
  }

  return args.revendeurs.map((r) => {
    const siennes = parRevendeur.get(r.id) ?? [];
    const impayees = siennes.filter(estImpayee);
    const periodes = siennes
      .map((f) => String(f.period ?? ""))
      .filter((p) => p !== "")
      .sort();
    return {
      ...r,
      impayeCents: impayees.reduce((s, f) => s + (Number(f.totalCents) || 0), 0),
      nbImpayees: impayees.length,
      dernierePeriode: periodes.length > 0 ? periodes[periodes.length - 1] : null,
      encaisseCents: siennes
        .filter((f) => !estImpayee(f))
        .reduce((s, f) => s + (Number(f.totalCents) || 0), 0),
      prochainPalier: prochainPalier(r.licenceCount, r.tiers),
    };
  });
}

/**
 * L'ORDRE : ce qui demande une action, puis le plus gros portefeuille.
 *
 * Trier par date d'arrivée mettrait le plus ancien en haut et laisserait
 * une facture impayée trois écrans plus bas. Un tableau se lit du haut,
 * donc le haut porte ce qui coûte quelque chose.
 */
export function trierRevendeurs(lignes: readonly LigneRevendeur[]): LigneRevendeur[] {
  return [...lignes].sort((a, b) => {
    if (a.impayeCents !== b.impayeCents) return b.impayeCents - a.impayeCents;
    if (a.licenceCount !== b.licenceCount) return b.licenceCount - a.licenceCount;
    return String(a.name ?? a.email ?? "").localeCompare(String(b.name ?? b.email ?? ""), "fr");
  });
}

export interface ResumeRevendeurs {
  actifs: number;
  suspendus: number;
  licences: number;
  comptes: number;
  impayeCents: number;
  nbImpayees: number;
  encaisseCents: number;
}

/**
 * Les totaux du bandeau.
 *
 * Ils sont la SOMME du tableau, jamais un second calcul : deux chiffres
 * calculés séparément finissent toujours par se contredire, et c'est
 * celui du haut qu'on croit.
 */
export function resumerRevendeurs(lignes: readonly LigneRevendeur[]): ResumeRevendeurs {
  return {
    actifs: lignes.filter((l) => estActif(l.status)).length,
    suspendus: lignes.filter((l) => !estActif(l.status)).length,
    // Un revendeur SUSPENDU garde ses comptes clients : couper son accès
    // au panneau ne touche pas aux comptes de ses clients. Ses licences
    // comptent donc dans le total, sinon le chiffre ne correspondrait
    // plus à ce qu'il y a en base.
    licences: lignes.reduce((s, l) => s + l.licenceCount, 0),
    comptes: lignes.reduce((s, l) => s + l.clientCount, 0),
    impayeCents: lignes.reduce((s, l) => s + l.impayeCents, 0),
    nbImpayees: lignes.reduce((s, l) => s + l.nbImpayees, 0),
    encaisseCents: lignes.reduce((s, l) => s + l.encaisseCents, 0),
  };
}
