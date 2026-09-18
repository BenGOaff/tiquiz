// lib/cadeau/atelierOffert.ts
//
// L'ATELIER OFFERT À QUI PASSE DU GRATUIT AU PAYANT (Béné, 18 septembre 2026).
//
// "Un user qui teste tiquiz gratos reçoit une séquence de 7 jours par
// email. Pendant ces 7 jours on lui propose de prendre un abonnement
// payant. S'il upgrade sur la version payante (n'importe laquelle) il
// reçoit en plus l'Atelier du Quiz gratos."
//
// Puis, le même jour, ses deux arbitrages :
//
//   * **le cadeau n'est ouvert que dans des FENÊTRES** : les 7 jours qui
//     suivent l'inscription gratuite, puis 2 jours à la relance de 6
//     mois, puis 2 jours à celle d'un an. Hors fenêtre, il upgrade sans
//     rien recevoir ;
//   * **les 30 jours offerts par un lien affilié se CUMULENT** avec le
//     cadeau. Ce sont deux mécaniques séparées, aucune ne mange l'autre.
//
// -- POURQUOI LA FENÊTRE SE LIT SUR UNE DATE ENVOYÉE, PAS CALCULÉE -----
//
// La relance de 6 mois part par un cron. Un cron ne tourne pas à la
// seconde près : il peut tourner en retard d'un jour après une panne, ou
// deux fois. Calculer la fenêtre depuis `inscritLe + 6 mois` donnerait
// donc une fenêtre qui s'est refermée AVANT que la personne ne reçoive
// l'email qui la lui annonce.
//
// La fenêtre part donc de la date d'ENVOI de la relance, qui est
// enregistrée. C'est la seule qui corresponde à ce que la personne a lu.
//
// -- ET ELLE NE SE DÉCIDE PAS AILLEURS ---------------------------------
//
// Trois endroits ouvrent un plan payant (le checkout Stripe, le webhook
// PayPal, le webhook Systeme.io). Si chacun décidait de son côté si le
// cadeau est dû, les trois finiraient par ne pas dire la même chose.
//
// PUR : aucune base, aucune horloge. `maintenant` est un PARAMÈTRE
// OBLIGATOIRE, comme partout ici : un calcul qui lit l'heure tout seul
// n'est pas testable, et un test qui dépend de l'heure clignote.

/** Les 7 jours qui suivent l'inscription gratuite. */
export const JOURS_FENETRE_INSCRIPTION = 7;

/** Les 2 jours qui suivent une relance. */
export const JOURS_FENETRE_RELANCE = 2;

/** Quand les relances partent, en jours depuis l'inscription gratuite. */
export const RELANCES_JOURS = [182, 365] as const;

const JOUR_MS = 24 * 60 * 60 * 1000;

/** Laquelle des trois portes est ouverte. */
export type FenetreCadeau = "inscription" | "relance_6_mois" | "relance_1_an";

export interface EtatCadeauAtelier {
  /** Quand le compte gratuit a été créé. */
  inscritLe: string | null;
  /** Quand la relance de 6 mois est PARTIE, pas quand elle aurait dû. */
  relance6moisLe: string | null;
  /** Idem pour celle d'un an. */
  relance1anLe: string | null;
  /**
   * Quand le cadeau a DÉJÀ été offert.
   *
   * Présent = on ne le redonne pas. Ce n'est pas une punition : l'accès
   * à l'Atelier est à vie, donc le redonner ne ferait qu'envoyer un
   * deuxième email de bienvenue à quelqu'un qui l'a déjà.
   */
  offertLe: string | null;
}

export type VerdictCadeau =
  | { ouvert: true; fenetre: FenetreCadeau; finLe: string }
  | { ouvert: false; motif: MotifCadeauFerme };

export type MotifCadeauFerme =
  /** Déjà reçu : l'accès est à vie, rien à refaire. */
  | "deja_offert"
  /** On ne sait pas quand il s'est inscrit : on n'invente pas de fenêtre. */
  | "date_inconnue"
  /** Aucune fenêtre ouverte en ce moment. Le cas le plus fréquent. */
  | "hors_fenetre";

function t(iso: string | null | undefined): number | null {
  const v = Date.parse(String(iso ?? ""));
  return Number.isFinite(v) ? v : null;
}

/**
 * LE CADEAU EST-IL DÛ, MAINTENANT, À CETTE PERSONNE ?
 *
 * On rend la FIN de la fenêtre avec la réponse : l'écran et l'email
 * doivent pouvoir dire "jusqu'à jeudi", et le recalculer ailleurs
 * donnerait deux dates pour la même promesse.
 */
export function cadeauAtelierOuvert(
  etat: EtatCadeauAtelier,
  maintenant: Date,
): VerdictCadeau {
  // DÉJÀ OFFERT PASSE EN PREMIER. L'accès est à vie : une fenêtre
  // rouverte ne doit pas renvoyer un deuxième email de bienvenue à
  // quelqu'un qui suit déjà la formation.
  if (t(etat.offertLe) != null) return { ouvert: false, motif: "deja_offert" };

  const inscrit = t(etat.inscritLe);
  if (inscrit == null) {
    // SANS DATE D'INSCRIPTION, ON N'OUVRE RIEN. Le repli conservateur
    // est de ne pas offrir : un cadeau manqué se rattrape à la main, un
    // cadeau donné à tort ouvre un accès à vie qu'on ne reprend pas.
    return { ouvert: false, motif: "date_inconnue" };
  }

  const n = maintenant.getTime();

  // Les trois portes, de la plus ancienne à la plus récente. La PREMIÈRE
  // ouverte gagne : elles ne se recouvrent jamais dans la vraie vie
  // (7 jours, puis 6 mois plus tard), et si elles se recouvraient, la
  // plus ancienne est celle que la personne a lue en premier.
  const portes: { fenetre: FenetreCadeau; debut: number | null; jours: number }[] = [
    { fenetre: "inscription", debut: inscrit, jours: JOURS_FENETRE_INSCRIPTION },
    { fenetre: "relance_6_mois", debut: t(etat.relance6moisLe), jours: JOURS_FENETRE_RELANCE },
    { fenetre: "relance_1_an", debut: t(etat.relance1anLe), jours: JOURS_FENETRE_RELANCE },
  ];

  for (const p of portes) {
    if (p.debut == null) continue;
    const fin = p.debut + p.jours * JOUR_MS;
    if (n >= p.debut && n <= fin) {
      return { ouvert: true, fenetre: p.fenetre, finLe: new Date(fin).toISOString() };
    }
  }
  return { ouvert: false, motif: "hors_fenetre" };
}

/**
 * CE COMPTE DOIT-IL RECEVOIR UNE RELANCE AUJOURD'HUI, ET LAQUELLE ?
 *
 * Lu par le cron. Il rend la relance à envoyer, ou `null`.
 *
 * -- POURQUOI UNE FENÊTRE DE RATTRAPAGE, ET PAS UNE ÉGALITÉ ------------
 *
 * Un cron qui ne tournerait pas pendant deux jours (une panne, un
 * déploiement) manquerait DÉFINITIVEMENT tous les comptes dont le
 * 182e jour tombe dedans, et personne ne le verrait : la relance ne
 * part pas, et rien ne dit qu'elle aurait dû partir.
 *
 * On accepte donc un retard, borné. `RATTRAPAGE_JOURS` est large assez
 * pour couvrir une panne d'un week-end, et assez court pour qu'une
 * relance "6 mois" ne parte pas au huitième mois.
 */
export const RATTRAPAGE_JOURS = 7;

export type RelanceAEnvoyer = "relance_6_mois" | "relance_1_an";

export function relanceAEnvoyer(
  etat: EtatCadeauAtelier,
  maintenant: Date,
): RelanceAEnvoyer | null {
  // Le cadeau déjà offert n'a plus rien à relancer : la personne est
  // passée au payant et suit la formation.
  if (t(etat.offertLe) != null) return null;

  const inscrit = t(etat.inscritLe);
  if (inscrit == null) return null;

  const jours = (maintenant.getTime() - inscrit) / JOUR_MS;

  // L'ORDRE COMPTE : on regarde la plus ANCIENNE échéance d'abord. Un
  // compte d'un an qui n'a jamais reçu celle de 6 mois (le cron n'a
  // jamais tourné) reçoit celle d'un an, pas les deux d'un coup.
  if (
    t(etat.relance1anLe) == null &&
    jours >= RELANCES_JOURS[1] &&
    jours <= RELANCES_JOURS[1] + RATTRAPAGE_JOURS
  ) {
    return "relance_1_an";
  }
  if (
    t(etat.relance6moisLe) == null &&
    jours >= RELANCES_JOURS[0] &&
    jours <= RELANCES_JOURS[0] + RATTRAPAGE_JOURS
  ) {
    return "relance_6_mois";
  }
  return null;
}

/**
 * UN CHANGEMENT DE PLAN OUVRE-T-IL LE DROIT AU CADEAU ?
 *
 * "Il upgrade du gratuit vers n'importe quelle offre payante."
 *
 * Les deux moitiés comptent, et l'oubli de la première est le piège :
 * quelqu'un qui passe de `monthly` à `yearly` n'upgrade pas DEPUIS LE
 * GRATUIT, et lui offrir l'Atelier reviendrait à le donner à tous les
 * changements de palier, donc à tout le monde.
 *
 * `null` en plan précédent compte comme gratuit : c'est le cas d'un
 * compte créé par le paiement lui même... mais celui là n'a jamais eu
 * de période gratuite, donc il n'a pas de fenêtre d'inscription ouverte
 * non plus, et `cadeauAtelierOuvert` s'en occupe. Les deux contrôles se
 * complètent, aucun ne suffit seul.
 */
const PLANS_GRATUITS: ReadonlySet<string> = new Set(["", "free", "gratuit", "none"]);

export function estUnUpgradeDepuisLeGratuit(
  planAvant: string | null | undefined,
  planApres: string | null | undefined,
): boolean {
  const avant = String(planAvant ?? "").trim().toLowerCase();
  const apres = String(planApres ?? "").trim().toLowerCase();
  if (!PLANS_GRATUITS.has(avant)) return false;
  return Boolean(apres) && !PLANS_GRATUITS.has(apres);
}
