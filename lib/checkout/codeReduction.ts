// lib/checkout/codeReduction.ts
//
// LE CODE DE RÉDUCTION D'UN AFFILIÉ, POSÉ SUR LE BON DE COMMANDE.
//
// Béné, 25 août 2026 : "Codes de réduction : à prévoir pour que j'en
// attribue un à un affilié si besoin. Ne sera valable que sur le lien de
// l'affilié."
//
// La DÉCISION vit chez Tipote (`lib/affiliate/codeReduction.ts`), avec
// le registre des affiliées : le code appartient à une affiliée, il doit
// s'afficher à côté de ses commissions, et copier la table ici donnerait
// deux registres. Ce module ne fait que POSER LA QUESTION, et il la pose
// au même endroit et avec le même secret que celui qui demande déjà à
// qui appartient le lien.
//
// -- CE QU'ON FAIT QUAND ON NE SAIT PAS --------------------------------
//
// Prix plein, et ça CRIE dans le journal. C'est le seul repli tenable :
// appliquer une remise qu'on n'a pas pu vérifier reviendrait à laisser
// n'importe quel mot de six lettres rabotter une vente. L'écran, lui,
// dit que le code n'a pas pu être vérifié plutôt que "code invalide" :
// envoyer quelqu'un chercher une faute de frappe dans un code juste,
// c'est une vente perdue sur une panne de notre côté.

const TIPOTE_PAR_DEFAUT = "https://app.tipote.com";

/** Pourquoi un code ne s'applique pas. Le mot, pas la phrase : le bon de
 *  commande existe en plusieurs langues, c'est lui qui la met en mots. */
export type RaisonCode =
  | "inconnu"
  | "desactive"
  | "expire"
  | "mauvais-lien"
  | "produit-exclu"
  | "remise-illisible"
  | "pas-encore"
  | "indisponible";

/**
 * Ce qu'un code donne. Une UNION, pas un objet à champs optionnels.
 *
 * Béné, 25 août 2026 : "un pourcentage sur le premier mois après le mois
 * gratuit ; un pourcentage à vie ; un pourcentage ponctuel sur une durée
 * précise ; un pourcentage selon l'abonnement ; deux mois gratis au lieu
 * d'un."
 *
 * Cinq demandes, deux natures. Une remise se calcule sur un prix et
 * s'exprime en coupon ; des jours offerts rallongent l'essai et ne
 * touchent aucun prix. Les mélanger dans un objet à champs optionnels
 * laisserait un appelant lire le mauvais champ, et ce serait un client
 * qui paie ce qu'il ne devait pas payer.
 */
export type Avantage =
  | { type: "percent"; percentOff: number; duree: "once" | "forever" | "months"; mois: number | null }
  | { type: "free_days"; jours: number };

export type VerdictRemise =
  | { valide: true; code: string; avantage: Avantage }
  | { valide: false; raison: RaisonCode };

/**
 * Relit l'avantage reçu, sans jamais faire confiance à sa forme.
 *
 * Il arrive d'une autre application par le réseau : une réponse tronquée
 * ou une version plus ancienne de l'autre app doit donner "pas
 * d'avantage", jamais un objet à moitié rempli dont on lirait un champ
 * indéfini comme un prix.
 */
function lireAvantage(brut: unknown): Avantage | null {
  if (!brut || typeof brut !== "object") return null;
  const a = brut as Record<string, unknown>;
  if (a.type === "free_days") {
    const jours = Number(a.jours);
    if (!Number.isInteger(jours) || jours < 1 || jours > 365) return null;
    return { type: "free_days", jours };
  }
  if (a.type !== "percent") return null;
  const pct = Number(a.percentOff);
  if (!Number.isInteger(pct) || pct < 1 || pct > 90) return null;
  const duree = a.duree === "forever" ? "forever" : a.duree === "months" ? "months" : "once";
  if (duree === "months") {
    const mois = Number(a.mois);
    if (!Number.isInteger(mois) || mois < 1 || mois > 36) return null;
    return { type: "percent", percentOff: pct, duree, mois };
  }
  return { type: "percent", percentOff: pct, duree, mois: null };
}

/** L'app qui porte le registre. Validée, jamais locale (drame Véronique). */
export function tipoteBaseUrl(env: Record<string, string | undefined> = process.env): string {
  const brut = String(env.TIPOTE_APP_URL ?? "").trim().replace(/\/+$/, "");
  if (/^https:\/\/[^/]+$/.test(brut) && !/localhost|127\.|::1|\.local/.test(brut)) return brut;
  return TIPOTE_PAR_DEFAUT;
}

/**
 * Le code saisi vaut-il une remise sur CE bon de commande ?
 *
 * `ref` ET `sa` sont passés séparément, jamais devinés l'un de l'autre :
 * nos liens portent `?ref=`, les anciens tunnels Systeme.io portent
 * `?sa=`, et deviner à la forme casserait le jour où une affiliée
 * choisit un code qui ressemble à un `sa`.
 */
export async function verifierCodeReduction(args: {
  code: string;
  produit: string;
  ref: string | null;
  sa: string | null;
}): Promise<VerdictRemise> {
  const code = String(args.code ?? "").trim();
  if (!code) return { valide: false, raison: "inconnu" };

  const secret = (process.env.AFFILIATE_INTERNAL_SECRET ?? "").trim();
  if (!secret) {
    console.error("[commande] AFFILIATE_INTERNAL_SECRET absente : aucun code de reduction ne peut etre verifie");
    return { valide: false, raison: "indisponible" };
  }

  try {
    const res = await fetch(`${tipoteBaseUrl()}/api/affiliate/code-reduction`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Affiliate-Secret": secret },
      body: JSON.stringify({ code, produit: args.produit, ref: args.ref, sa: args.sa }),
      // Un acheteur attend devant son écran : on ne le fait pas patienter
      // pendant que l'autre app redémarre.
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) {
      console.error(`[commande] verification du code impossible : HTTP ${res.status}`);
      return { valide: false, raison: "indisponible" };
    }
    const j = (await res.json()) as {
      ok?: boolean;
      valide?: boolean;
      code?: string;
      avantage?: unknown;
      raison?: string;
    };
    if (!j.ok) return { valide: false, raison: "indisponible" };
    const avantage = lireAvantage(j.avantage);
    if (j.valide && avantage) {
      return { valide: true, code: String(j.code ?? code), avantage };
    }
    const raisons: RaisonCode[] = [
      "inconnu", "desactive", "expire", "pas-encore", "mauvais-lien", "produit-exclu", "remise-illisible",
    ];
    const raison = raisons.find((r) => r === j.raison) ?? "inconnu";
    return { valide: false, raison };
  } catch {
    console.error("[commande] verification du code : Tipote injoignable");
    return { valide: false, raison: "indisponible" };
  }
}

/**
 * Le prix remisé, en centimes.
 *
 * Recalculé ICI, jamais reçu du client : un pourcentage qui voyage dans
 * le corps d'une requête est un prix que l'acheteur choisit lui-même.
 * Arrondi à l'entier le plus proche, jamais en dessous d'un centime : un
 * montant à zéro ferait un abonnement gratuit là où on voulait une
 * remise, et les deux ne se ressemblent que sur le papier (pas de
 * commission, pas de facture, un client qu'aucun écran ne distingue).
 */
export function prixRemiseCents(montantCents: number, percentOff: number): number {
  if (!Number.isFinite(montantCents) || montantCents <= 0) return 0;
  const pct = Number(percentOff);
  if (!Number.isInteger(pct) || pct < 1 || pct > 90) return Math.round(montantCents);
  return Math.max(1, Math.round((montantCents * (100 - pct)) / 100));
}

// ── CE QUE L'AVANTAGE DEVIENT SUR LE BON DE COMMANDE ────────────────
//
// Trois sorties possibles, et elles ne se mélangent jamais :
//   - `jours`   : l'essai gratuit à ouvrir (le mois offert, allongé par
//                 un code `free_days`) ;
//   - `coupon`  : la remise à poser TOUT DE SUITE sur la session ;
//   - `differee`: la remise à poser à la FIN de l'essai.
//
// Béné, 25 août 2026 : "un pourcentage sur le premier mois APRÈS le mois
// gratuit", et "deux mois gratis au lieu d'un".
//
// LES JOURS D'UN CODE REMPLACENT, ILS NE S'AJOUTENT PAS. "Deux mois
// gratis AU LIEU d'un" : 60 jours, pas 30 + 60.
//
// ET ILS N'OUVRENT PAS UN ESSAI REFUSÉ. Le moteur du mois offert dit
// déjà "un seul par personne, point barre" (23 août) et refuse
// l'auto-affiliation. Un code qui passerait outre rouvrirait exactement
// le trou qu'on a fermé. Le code allonge un cadeau accordé, il n'en
// accorde pas un nouveau.
//
// LA REMISE ATTEND LA FIN DE L'ESSAI dès qu'il y en a un, quelle que
// soit sa durée : cf. lib/checkout/remiseDifferee.ts pour la raison
// (une facture d'essai à 0 € pourrait consommer la remise).

export type PlanDuCheckout = {
  /** Les jours d'essai à ouvrir. 0 = aucun. */
  jours: number;
  /** La remise à poser sur la session tout de suite. */
  coupon: { code: string; percentOff: number; duree: "once" | "forever" | "months"; mois: number | null } | null;
  /** La remise à poser à la fin de l'essai, écrite dans les metadata. */
  differee: { code: string; percentOff: number; duree: "once" | "forever" | "months"; mois: number | null } | null;
  /** Ce que l'écran doit dire du code, quand il ne s'applique pas. */
  refus: "essai-refuse" | null;
};

export function planDuCheckout(args: {
  joursOfferts: number;
  avantage: Avantage | null;
}): PlanDuCheckout {
  const base = Number.isFinite(args.joursOfferts) ? Math.max(0, Math.trunc(args.joursOfferts)) : 0;
  const a = args.avantage;

  if (!a) return { jours: base, coupon: null, differee: null, refus: null };

  if (a.type === "free_days") {
    // Aucun essai accordé (déjà reçu, auto-affiliation, lien inconnu) :
    // le code n'en ouvre pas un, et l'écran le DIT.
    if (base <= 0) return { jours: 0, coupon: null, differee: null, refus: "essai-refuse" };
    return { jours: Math.max(base, a.jours), coupon: null, differee: null, refus: null };
  }

  const remise = { code: "", percentOff: a.percentOff, duree: a.duree, mois: a.mois };
  return base > 0
    ? { jours: base, coupon: null, differee: remise, refus: null }
    : { jours: 0, coupon: remise, differee: null, refus: null };
}
