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
// -- LES TROIS RÈGLES, ET POURQUOI ELLES VIVENT ICI --------------------
//
// Deux chemins mènent à un mois offert : l'inscription par un lien
// d'affiliée, et l'octroi app-à-app (`/api/partner/grant-plus-trial`,
// l'opération "les 20 premiers"). Si chacun décidait de son côté, le
// "point barre" ne tiendrait pas : quelqu'un prendrait un mois par
// chaque porte. La règle vit donc ICI, et les deux l'appellent.
//
// Aucune entrée / sortie dans ce fichier : il décide, il ne lit rien et
// n'écrit rien. C'est ce qui le rend testable, et c'est la règle du
// dépôt depuis le 1er août.

/** Ce qu'on répond à une demande de mois offert. */
export type VerdictMoisOffert =
  | { ok: true; aVerifier: false }
  /** On l'accorde, mais quelque chose sent l'auto-affiliation. */
  | { ok: true; aVerifier: true; motif: MotifSuspect }
  | { ok: false; motif: MotifRefus };

export type MotifRefus =
  | "deja_recu"
  | "deja_premium"
  | "auto_affiliation"
  | "affiliee_inconnue";

export type MotifSuspect = "meme_ip";

/** Les paliers qui n'ont rien à gagner à un mois offert. */
const PLANS_SANS_OBJET: ReadonlySet<string> = new Set([
  "monthly_plus",
  "yearly_plus",
  "lifetime",
  "beta",
]);

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
  /** Son palier actuel. `free` par défaut. */
  planActuel?: string | null;
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

  // 2. Rien à offrir à qui a déjà mieux. Ce n'est pas un refus, c'est
  //    un cadeau sans objet : lui poser un essai retirerait son palier
  //    à l'expiration.
  const plan = String(d.planActuel ?? "free").trim().toLowerCase();
  if (PLANS_SANS_OBJET.has(plan)) return { ok: false, motif: "deja_premium" };

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
  deja_premium: "a déjà un palier supérieur",
  auto_affiliation: "s'inscrit avec l'adresse de l'affiliée",
  affiliee_inconnue: "lien d'affiliation inconnu ou suspendu",
  meme_ip: "même adresse IP qu'un autre mois offert sur ce lien",
};
