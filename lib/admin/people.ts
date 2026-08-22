// lib/admin/people.ts
//
// UNE LIGNE PAR PERSONNE, ET TOUT CE QU'ON SAIT D'ELLE.
//
// Béné, 21 août : "tu peux pas centraliser ? Je vois les élèves, leurs
// infos + le bouton rembourser ? Au lieu d'avoir deux écrans... pas
// ouf..." Puis, plus complet : "qui teste en gratos, qui achète, quels
// plans sont vendus, qui est abonné, qui a arrêté son abo, les emails,
// les modes de paiement (...) un outil capable de m'aider à piloter mon
// business facilement, sans bullshit."
//
// -- POURQUOI CETTE FONCTION EXISTE, PLUTOT QU'UN COMPOSANT -----------
//
// Trois sources disent chacune un morceau de la vérité :
//
//   - `profiles`            : qui a un compte, et son plan AUJOURD'HUI ;
//   - les ventes            : qui a payé, combien, comment, quand ;
//   - `subscription_churn`  : qui part, quand, et pourquoi.
//
// Les recoller est une règle métier, pas de l'affichage. Enfermée dans
// un composant React elle ne serait pas testable, donc pas testée, donc
// exactement là où les bugs s'installent (règle du 1er août).
//
// -- LA RÈGLE DE RAPPROCHEMENT, ET ELLE EST LA MÊME QUE LE 8 JUIN -----
//
// La distribution des leads par résultat a sa règle unique : on SEED sur
// la source de vérité, on rattache ce qu'on peut, et **ce qui ne se
// rattache à rien est traité honnêtement**, jamais rangé dans un bucket
// fourre-tout.
//
// Ici la source de vérité est `profiles` : ce sont les gens qui ont un
// compte. Une vente qui ne se rattache à aucun compte n'est PAS
// silencieusement écartée : elle sort dans `ventesOrphelines`, parce
// qu'une personne qui a payé sans avoir ses accès est exactement le
// drame Ivan, et qu'un tableau propre qui cache ça coûte un client.
//
// Le rapprochement se fait sur l'adresse email en minuscules : c'est le
// seul point commun entre un compte Supabase et un paiement Stripe ou
// PayPal. Elle n'est pas parfaite (quelqu'un peut payer avec l'adresse
// de son conjoint), et c'est précisément pour ça que les orphelines sont
// affichées au lieu d'être perdues.

import type { Sale } from "@/lib/checkout/sales";
import type { AtelierPerson } from "@/lib/admin/atelier";

/** Ce qu'on lit d'un compte. Volontairement réduit à ce qui s'affiche. */
export interface ProfileRow {
  user_id?: string | null;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  plan?: string | null;
  created_at?: string | null;
  last_sign_in?: string | null;
  quiz_count?: number | null;
  lead_count?: number | null;
  stripe_customer_id?: string | null;
  /** Renseigné si le compte appartient au portefeuille d'un revendeur. */
  reseller_name?: string | null;
}

/** Une ligne de `subscription_churn`. */
export interface ChurnRow {
  email?: string | null;
  reference?: string | null;
  plan?: string | null;
  amount_cents?: number | null;
  cancelled_at?: string | null;
  ends_at?: string | null;
  ended_at?: string | null;
  reactivated_at?: string | null;
  stripe_feedback?: string | null;
  stripe_comment?: string | null;
  reason?: string | null;
}

/**
 * OÙ EN EST CETTE PERSONNE, EN UN MOT.
 *
 * Cinq états, et ils répondent aux cinq premières lignes de la liste de
 * Béné. Ils sont EXCLUSIFS et ordonnés : quelqu'un qui a résilié mais
 * dont l'accès court encore est `partant`, pas `abonne`, parce que c'est
 * l'information qui appelle une action.
 */
export type PersonStatus =
  /** Compte gratuit, jamais payé. "Qui teste en gratos." */
  | "essai"
  /** Payant, et rien ne dit qu'il s'en va. */
  | "abonne"
  /** Il a demandé à partir, son accès court jusqu'à la fin payée. */
  | "partant"
  /** Il est parti, l'accès est retombé en gratuit. */
  | "parti"
  /** Payant à vie (lifetime, beta) : pas d'abonnement à suivre. */
  | "avie"
  /**
   * ÉLÈVE DE L'ATELIER SANS COMPTE TIQUIZ.
   *
   * Ce n'est PAS un essai, et les confondre serait mentir deux fois :
   * la personne n'essaie pas Tiquiz (elle n'y a pas de compte), et elle
   * a payé l'Atelier (donc ce n'est pas un prospect). C'est au contraire
   * exactement la liste que Béné a envie d'inviter.
   */
  | "atelier";

export interface Person {
  email: string;
  name: string | null;
  userId: string | null;
  /** A-t-elle un compte Tiquiz ? Faux = élève de l'Atelier seulement. */
  hasTiquizAccount: boolean;
  plan: string;
  status: PersonStatus;
  createdAt: string | null;
  lastSignIn: string | null;
  quizCount: number;
  leadCount: number;
  resellerName: string | null;
  /** Peut-il gérer sa carte lui même ? (abonnement pris chez nous) */
  selfServe: boolean;

  /** Ce qu'il a payé EN TOUT chez nous, remboursements déduits. */
  paidCents: number;
  /** Ses ventes, la plus récente d'abord. Porte le bouton rembourser. */
  sales: Sale[];
  /** Comment il a payé la dernière fois. */
  lastProvider: Sale["provider"] | null;
  lastPaidAt: string | null;

  /** Ce que l'Atelier sait d'elle, ou `null` si elle n'y est pas. */
  atelier: {
    /** `active` = élève inscrit. */
    status: string | null;
    tier: string | null;
    grantedAt: string | null;
    daysDone: number;
  } | null;

  /** Renseigné quand il part ou qu'il est parti. */
  churn: {
    cancelledAt: string | null;
    endsAt: string | null;
    endedAt: string | null;
    /** La raison choisie chez Stripe, puis son commentaire, puis la nôtre. */
    feedback: string | null;
    comment: string | null;
  } | null;
}

/**
 * CHEZ QUOI CETTE PERSONNE EST-ELLE CLIENTE ?
 *
 * Béné, 22 août : "je peux pas avoir une seule liste avec toutes les
 * infos ? Genre s'il est client Tiquiz ou Atelier ou les deux".
 *
 * La question est celle de tous les jours, et elle n'avait de réponse
 * nulle part : il fallait croiser la colonne Plan et la colonne Atelier
 * de tête. Elle vit ici, en fonction pure, pour que l'écran l'affiche
 * sans la recalculer.
 *
 * `aucun` existe et n'est pas un cas d'erreur : une personne peut avoir
 * un compte Tiquiz gratuit sans être élève, elle est alors cliente de
 * rien. Le confondre avec `tiquiz` gonflerait la clientèle payante.
 */
export type ClientKind = "tiquiz" | "atelier" | "les-deux" | "aucun";

export function readClientKind(p: {
  hasTiquizAccount: boolean;
  plan: string;
  atelier: { status: string | null } | null;
}): ClientKind {
  const tiquiz = p.hasTiquizAccount && String(p.plan ?? "").trim() !== "" && p.plan !== "free";
  const atelier = p.atelier?.status === "active";
  if (tiquiz && atelier) return "les-deux";
  if (tiquiz) return "tiquiz";
  if (atelier) return "atelier";
  return "aucun";
}

export interface PeopleTotals {
  comptes: number;
  essai: number;
  abonnes: number;
  partants: number;
  partis: number;
  avie: number;
  /** Élèves de l'Atelier sans compte Tiquiz. */
  atelierSeul: number;
  /** Élèves de l'Atelier, avec ou sans compte Tiquiz. */
  atelier: number;
  /** Encaissé sur la période lue, remboursements déduits, en centimes. */
  encaisseCents: number;
  rembourseCents: number;
  /**
   * DES VENTES BIEN RÉELLES DONT ON N'A PAS LE MONTANT.
   *
   * Systeme.io ne nous transmet pas (encore) le prix payé à un endroit
   * qu'on sache lire. Les compter est le seul moyen honnête d'afficher
   * un chiffre d'affaires : sans ça, l'écran additionne des zéros et
   * annonce "0,00 € encaissé" sur un mois où l'argent est bien rentré.
   *
   * Règle du 8 juin, déjà écrite pour l'Atelier : on n'affiche pas un
   * total dont le dénominateur ment. Un chiffre qui a l'air juste vaut
   * moins que pas de chiffre du tout.
   */
  ventesSansMontant: number;
  /** Par produit vendu, pour "quels plans sont vendus". */
  parProduit: { productId: string; count: number; totalCents: number; sansMontant: number }[];
}

export interface PeopleView {
  people: Person[];
  totals: PeopleTotals;
  /**
   * L'argent est entré et personne n'apparaît en face.
   *
   * Chaque ligne est une action à faire, pas du bruit : c'est pour ça
   * qu'elle sort au lieu d'être écartée en silence.
   */
  ventesOrphelines: Sale[];
}

/** LIFETIME et BETA : payants, mais sans abonnement à suivre. */
const PLANS_A_VIE = new Set(["lifetime", "beta"]);

function cle(email: string | null | undefined): string {
  return String(email ?? "").trim().toLowerCase();
}

function nomDe(p: ProfileRow): string | null {
  const n = [p.first_name, p.last_name]
    .map((v) => String(v ?? "").trim())
    .filter(Boolean)
    .join(" ")
    .trim();
  return n || null;
}

/** Le plus récent des deux, en tolérant les dates illisibles. */
function plusRecent(a: string | null, b: string | null): string | null {
  const ta = a ? Date.parse(a) : Number.NaN;
  const tb = b ? Date.parse(b) : Number.NaN;
  if (!Number.isFinite(ta)) return Number.isFinite(tb) ? b : null;
  if (!Number.isFinite(tb)) return a;
  return ta >= tb ? a : b;
}

/**
 * L'ÉTAT D'UNE PERSONNE, ET IL SE CALCULE DANS CET ORDRE.
 *
 * L'ordre n'est pas décoratif : quelqu'un qui a résilié est encore sur
 * un plan payant jusqu'à la fin de sa période. Lire le plan d'abord le
 * rangerait dans "abonné" et Béné ne verrait jamais qu'il s'en va, donc
 * n'aurait jamais l'occasion de le retenir.
 */
export function readPersonStatus(input: {
  /**
   * A-t-elle un compte Tiquiz ?
   *
   * **Paramètre OBLIGATOIRE, jamais deviné du plan.** Une élève de
   * l'Atelier sans compte Tiquiz aurait un plan vide, donc `free`, donc
   * "Essai" : l'écran annoncerait qu'elle essaie un produit auquel elle
   * n'a pas accès. C'est la règle du 1er août, appliquée avant que le
   * bug n'existe.
   */
  hasTiquizAccount: boolean;
  plan: string;
  churn: ChurnRow | null;
}): PersonStatus {
  if (!input.hasTiquizAccount) return "atelier";

  const churn = input.churn;
  const p = String(input.plan ?? "").trim().toLowerCase() || "free";

  if (PLANS_A_VIE.has(p)) return "avie";

  if (churn) {
    // Il a annulé sa résiliation : il est redevenu un abonné ordinaire.
    const reactive = Boolean(churn.reactivated_at);
    if (!reactive) {
      if (churn.ended_at) return "parti";
      if (churn.cancelled_at) return "partant";
    }
  }

  return p === "free" ? "essai" : "abonne";
}

/**
 * Recolle les trois sources en une liste de personnes.
 *
 * Fonction PURE : elle prend des lignes, elle rend une vue. C'est ce qui
 * permet de la tester sur des cas tordus (une vente sans adresse, deux
 * départs pour la même personne, un remboursement partiel) sans monter
 * de base ni de navigateur.
 */
export function buildPeople(input: {
  profiles: ProfileRow[];
  sales: Sale[];
  churn: ChurnRow[];
  /**
   * Les élèves de l'Atelier.
   *
   * Vide quand l'Atelier est injoignable : l'écran s'affiche quand même
   * et DIT qu'il est incomplet, plutôt que de tomber. Voir
   * `lib/admin/atelier.ts`.
   */
  atelier?: AtelierPerson[];
}): PeopleView {
  // 1. SEED sur la source de vérité : les comptes. Un compte sans vente
  //    doit apparaître (c'est "qui teste en gratos"), donc on part de là
  //    et jamais des paiements.
  const parEmail = new Map<string, Person>();
  for (const p of input.profiles) {
    const email = cle(p.email);
    if (!email) continue;
    parEmail.set(email, {
      email,
      name: nomDe(p),
      userId: String(p.user_id ?? "").trim() || null,
      hasTiquizAccount: true,
      plan: String(p.plan ?? "").trim().toLowerCase() || "free",
      status: "essai",
      createdAt: p.created_at ?? null,
      lastSignIn: p.last_sign_in ?? null,
      quizCount: Number(p.quiz_count) || 0,
      leadCount: Number(p.lead_count) || 0,
      resellerName: String(p.reseller_name ?? "").trim() || null,
      selfServe: Boolean(String(p.stripe_customer_id ?? "").trim()),
      paidCents: 0,
      sales: [],
      lastProvider: null,
      lastPaidAt: null,
      atelier: null,
      churn: null,
    });
  }

  // 1 bis. LES ÉLÈVES DE L'ATELIER.
  //
  // Ceux qui ont aussi un compte Tiquiz enrichissent leur ligne. Ceux
  // qui n'en ont pas en CRÉENT une : ce sont des clientes payantes, et
  // les laisser dehors ferait exactement ce que Béné reprochait à la
  // première version, "tout sauf fiable et exhaustif".
  for (const a of input.atelier ?? []) {
    const email = cle(a.email);
    if (!email) continue;
    const infos = {
      status: a.status,
      tier: a.tier,
      grantedAt: a.grantedAt,
      daysDone: a.daysDone,
    };
    const existante = parEmail.get(email);
    if (existante) {
      existante.atelier = infos;
      // Son nom peut n'être renseigné que d'un seul côté.
      existante.name = existante.name ?? a.name;
      continue;
    }
    parEmail.set(email, {
      email,
      name: a.name,
      userId: null,
      hasTiquizAccount: false,
      plan: "-",
      status: "atelier",
      createdAt: a.createdAt,
      lastSignIn: a.lastSignIn,
      quizCount: 0,
      leadCount: 0,
      resellerName: null,
      selfServe: false,
      paidCents: 0,
      sales: [],
      lastProvider: null,
      lastPaidAt: null,
      atelier: infos,
      churn: null,
    });
  }

  // 2. Les départs. Une personne peut en avoir plusieurs (elle est
  //    partie, revenue, repartie) : on garde le PLUS RÉCENT, sinon
  //    l'écran annoncerait un départ vieux d'un an sur quelqu'un qui
  //    paie de nouveau.
  const dernierDepart = new Map<string, ChurnRow>();
  for (const c of input.churn) {
    const email = cle(c.email);
    if (!email) continue;
    const vu = dernierDepart.get(email);
    if (!vu || plusRecent(vu.cancelled_at ?? null, c.cancelled_at ?? null) === c.cancelled_at) {
      dernierDepart.set(email, c);
    }
  }

  // 3. Les ventes. On ne CRÉE jamais de personne à partir d'une vente :
  //    ce qui ne se rattache à rien part dans les orphelines, où chaque
  //    ligne est une action a faire.
  const orphelines: Sale[] = [];
  let encaisse = 0;
  let rembourse = 0;
  const parProduit = new Map<string, { count: number; totalCents: number; sansMontant: number }>();
  let ventesSansMontant = 0;

  for (const v of input.sales) {
    const montant = Number(v.amountCents) || 0;
    if (montant <= 0) ventesSansMontant += 1;
    if (v.refundedAt) rembourse += montant;
    else encaisse += montant;

    const id = String(v.productId ?? "").trim() || "inconnu";
    const agg = parProduit.get(id) ?? { count: 0, totalCents: 0, sansMontant: 0 };
    agg.count += 1;
    if (montant <= 0) agg.sansMontant += 1;
    if (!v.refundedAt) agg.totalCents += montant;
    parProduit.set(id, agg);

    const personne = parEmail.get(cle(v.email));
    if (!personne) {
      orphelines.push(v);
      continue;
    }
    personne.sales.push(v);
    // Un remboursement ne compte pas comme de l'argent gardé.
    if (!v.refundedAt) personne.paidCents += montant;
  }

  // 4. On finalise chaque personne : tri de ses ventes, dernier moyen de
  //    paiement, état.
  for (const [email, personne] of parEmail) {
    personne.sales.sort((a, b) => (a.paidAt < b.paidAt ? 1 : -1));
    const derniere = personne.sales[0] ?? null;
    personne.lastProvider = derniere?.provider ?? null;
    personne.lastPaidAt = derniere?.paidAt ?? null;

    const c = dernierDepart.get(email) ?? null;
    if (c) {
      personne.churn = {
        cancelledAt: c.cancelled_at ?? null,
        endsAt: c.ends_at ?? null,
        endedAt: c.ended_at ?? null,
        feedback: c.stripe_feedback ?? null,
        // Sa phrase a lui d'abord (Stripe), la notre ensuite.
        comment: c.stripe_comment ?? c.reason ?? null,
      };
    }
    personne.status = readPersonStatus({
      hasTiquizAccount: personne.hasTiquizAccount,
      plan: personne.plan,
      churn: c,
    });
  }

  const people = [...parEmail.values()].sort((a, b) => {
    // Ceux qui ont paye en premier, puis les plus recents.
    if (a.paidCents !== b.paidCents) return b.paidCents - a.paidCents;
    return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
  });

  const compte = (s: PersonStatus) => people.filter((p) => p.status === s).length;

  return {
    people,
    ventesOrphelines: orphelines,
    totals: {
      comptes: people.length,
      essai: compte("essai"),
      abonnes: compte("abonne"),
      partants: compte("partant"),
      partis: compte("parti"),
      avie: compte("avie"),
      atelierSeul: compte("atelier"),
      atelier: people.filter((p) => p.atelier?.status === "active").length,
      encaisseCents: encaisse,
      rembourseCents: rembourse,
      ventesSansMontant,
      parProduit: [...parProduit.entries()]
        .map(([productId, v]) => ({ productId, ...v }))
        .sort((a, b) => b.totalCents - a.totalCents),
    },
  };
}

/**
 * L'ARGENT DU MOIS, ET CELUI DU MOIS D'AVANT.
 *
 * "Suivi des ventes en un clin d'oeil pour voir si ça monte ou ça
 * descend." Un total seul ne dit rien : c'est la COMPARAISON qui répond
 * à la question. On rend les deux et l'écart, jamais un chiffre nu.
 *
 * `maintenant` est un PARAMÈTRE et pas un `Date.now()` interne : sans
 * ça la fonction ne serait pas testable, et un test qui dépend de
 * l'horloge est un test qui clignote (leçon du 1er août).
 */
export function monthlyTrend(
  sales: Sale[],
  maintenant: Date,
): { moisCents: number; moisPrecedentCents: number; ecartPct: number | null } {
  const debutMois = Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth(), 1);
  const debutPrecedent = Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth() - 1, 1);

  let mois = 0;
  let precedent = 0;
  for (const v of sales) {
    // Un remboursement ne fait pas de chiffre d'affaires.
    if (v.refundedAt) continue;
    const t = Date.parse(v.paidAt);
    if (!Number.isFinite(t)) continue;
    const montant = Number(v.amountCents) || 0;
    if (t >= debutMois) mois += montant;
    else if (t >= debutPrecedent) precedent += montant;
  }

  // Pas de mois précédent = pas d'écart. Afficher "+100%" sur un premier
  // mois serait un chiffre inventé, et un chiffre inventé dans un
  // tableau de bord vaut moins que pas de chiffre du tout.
  const ecartPct = precedent > 0 ? Math.round(((mois - precedent) / precedent) * 100) : null;
  return { moisCents: mois, moisPrecedentCents: precedent, ecartPct };
}
