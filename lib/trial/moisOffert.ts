// lib/trial/moisOffert.ts
//
// UN MOIS OFFERT, UNE SEULE FOIS, ET JAMAIS À UN TRICHEUR.
//
// Béné, 23 août 2026 : "je pensais plutôt à garder le mois offert aux
// affiliés pour qu'ils puissent créer du contenu et tester ET qu'ils
// puissent [offrir] un mois gratuit pour tester à tous leurs affiliés
// comme argument de vente 'passe par mon lien et reçois un mois offert'.
// Bien sûr, ils ne peuvent pas cumuler mois offert par l'affilié PLUS
// mois offert EN TANT qu'affilié : au total c'est un mois offert, point
// barre. Il faut aussi tracker les tricheurs qui veulent s'autoaffilier :
// même adresse email, même adresse IP etc."
//
// -- CE QUE C'EST, EXACTEMENT (précision Béné du 23 août) -------------
//
// "Si l'user a un test tiquiz plus activé 15j il le garde mais on lui
// ajoute 30 jours de l'abonnement qu'il choisit : s'il prend mensuel il
// a 30j gratos à mensuel. S'il prend mensuel plus : il a 30j gratos à
// mensuel plus."
//
// Ce n'est donc PAS un palier prêté, c'est un ESSAI GRATUIT sur
// l'abonnement qu'il prend. Stripe (`trial_period_days`) et PayPal (un
// cycle de facturation `TRIAL`) le font nativement : le client choisit
// son palier, il n'est pas prélevé pendant 30 jours, puis il paie le
// prix de CE palier.
//
// Et ça règle le cumul tout seul : les 15 jours de Tiquiz Plus offerts
// par l'Atelier vivent dans `affiliate_trial_*` et continuent de
// tourner sans qu'on y touche. Deux mécaniques séparées, aucune ne
// mange l'autre. Le premier jet posait un `monthly_plus` prêté et
// devait additionner des jours dans les mêmes colonnes : c'était une
// complication née d'une mauvaise lecture.
//
// -- LES DEUX RÈGLES QUI RESTENT, ET POURQUOI ELLES VIVENT ICI --------
//
// Deux endroits ouvrent un essai : le bon de commande Stripe et le bon
// de commande PayPal. Si chacun décidait de son côté, le "point barre"
// ne tiendrait pas.

/** Ce qu'on répond à une demande de mois offert. */
export type VerdictMoisOffert =
  | { ok: true; aVerifier: false }
  /** On l'accorde, mais quelque chose sent l'auto-affiliation. */
  | { ok: true; aVerifier: true; motif: MotifSuspect }
  | { ok: false; motif: MotifRefus };

/**
 * LA DURÉE DU CADEAU, ÉCRITE UNE SEULE FOIS.
 *
 * Elle vit dans le module PUR parce qu'elle est lue des deux côtés : la
 * décision serveur (`moisOffertCheckout.ts`, qui tire `supabaseAdmin`)
 * et l'écran qui l'ANNONCE (le bon de commande). Deux nombres écrits
 * séparément finissent toujours par diverger, et là la divergence se
 * lit "30 jours offerts" sur la page et 15 sur le relevé.
 */
export const JOURS_MOIS_OFFERT_ANNONCE = 30;

export type MotifRefus = "deja_recu" | "auto_affiliation" | "affiliee_inconnue";

export type MotifSuspect = "meme_ip";

/**
 * DEUX ADRESSES QUI VONT DANS LA MÊME BOÎTE.
 *
 * `bene+tiquiz@gmail.com`, `b.e.n.e@gmail.com` et `bene@gmail.com`
 * arrivent toutes chez la même personne : chez Gmail, les points sont
 * ignorés et tout ce qui suit un `+` aussi. C'est LE moyen le plus
 * simple de s'auto-affilier, et comparer les adresses brutes ne le voit
 * pas.
 *
 * Le `+` est retiré chez tout le monde (la convention est générale) ;
 * les points ne le sont QUE chez Gmail, parce qu'ailleurs
 * `jean.dupont@` et `jeandupont@` peuvent être deux personnes.
 */
const DOMAINES_GMAIL = new Set(["gmail.com", "googlemail.com"]);

export function normaliserEmail(brut: unknown): string {
  const v = String(brut ?? "").trim().toLowerCase();
  const at = v.lastIndexOf("@");
  if (at <= 0) return v;
  let local = v.slice(0, at);
  const domaine = v.slice(at + 1);
  const plus = local.indexOf("+");
  if (plus > 0) local = local.slice(0, plus);
  if (DOMAINES_GMAIL.has(domaine)) local = local.replace(/\./g, "");
  return `${local}@${domaine}`;
}

/** Deux adresses qui désignent la même boîte. */
export function memeBoite(a: unknown, b: unknown): boolean {
  const na = normaliserEmail(a);
  const nb = normaliserEmail(b);
  return na.length > 0 && na === nb;
}

export interface DemandeMoisOffert {
  /** L'adresse de la personne qui s'inscrit. */
  email: string;
  /** A-t-elle DÉJÀ reçu son mois offert, un jour, par n'importe quelle porte ? */
  dejaRecuLe?: string | null;
  /** L'adresse de l'affiliée dont le lien l'a amenée, si on la connaît. */
  emailAffiliee?: string | null;
  /** L'affiliée existe-t-elle et est-elle active ? */
  affilieeActive?: boolean;
  /** L'empreinte d'IP de cette inscription. */
  ipHash?: string | null;
  /**
   * Les empreintes d'IP des mois offerts DÉJÀ accordés sur le lien de
   * cette même affiliée. Une adresse qui en amène plusieurs, c'est une
   * personne qui se crée des comptes, pas une affiliée qui travaille.
   */
  ipsDejaVues?: readonly string[];
}

/**
 * LA DÉCISION.
 *
 * Ordre voulu : ce qui est CERTAIN refuse, ce qui est seulement
 * SUSPECT laisse passer et se signale. Bloquer sur une IP partagée
 * mettrait dehors un couple, deux collègues, une salle de formation :
 * on accorde, et Béné voit la ligne. Béné a demandé de "tracker" les
 * tricheurs, pas de fermer la porte au nez d'un client honnête.
 */
export function verdictMoisOffert(d: DemandeMoisOffert): VerdictMoisOffert {
  // 1. Un seul mois offert par personne, point barre. C'est la règle qui
  //    empêche le cumul entre les deux portes.
  if (d.dejaRecuLe) return { ok: false, motif: "deja_recu" };

  // Le palier actuel n'entre PAS dans la décision, et c'est voulu :
  // l'essai porte sur l'abonnement qu'il choisit, pas sur ce qu'il a
  // déjà. Ses 15 jours d'Atelier continuent de tourner à côté.

  // 3. Le lien d'une affiliée qu'on ne connaît pas n'offre rien : un
  //    identifiant inventé ne doit pas pouvoir distribuer des mois.
  if (d.emailAffiliee !== undefined && d.affilieeActive === false) {
    return { ok: false, motif: "affiliee_inconnue" };
  }

  // 4. S'inscrire par son PROPRE lien. Certain, donc refusé.
  if (d.emailAffiliee && memeBoite(d.email, d.emailAffiliee)) {
    return { ok: false, motif: "auto_affiliation" };
  }

  // 5. La même IP a déjà pris un mois sur ce lien. Suspect, pas certain.
  const ip = String(d.ipHash ?? "").trim();
  if (ip && (d.ipsDejaVues ?? []).includes(ip)) {
    return { ok: true, aVerifier: true, motif: "meme_ip" };
  }

  return { ok: true, aVerifier: false };
}

/** Ce que le journal et l'écran d'admin affichent. */
export const MOTIFS: Readonly<Record<MotifRefus | MotifSuspect, string>> = {
  deja_recu: "a déjà eu son mois offert",
  auto_affiliation: "s'inscrit avec l'adresse de l'affiliée",
  affiliee_inconnue: "lien d'affiliation inconnu ou suspendu",
  meme_ip: "même adresse IP qu'un autre mois offert sur ce lien",
};
