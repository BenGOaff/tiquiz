// lib/churn/askQueue.ts
//
// À QUI ON DEMANDE POURQUOI ELLE PART, ET SURTOUT À QUI ON NE DEMANDE PAS.
//
// Béné, 21 août : "qui a arrêté son abo : lui envoyer un mail pour lui
// demander pourquoi et consigner ces réponses pour level up l'outil."
//
// Un email automatique à une cliente qui vient de partir est ce qu'il y
// a de plus facile à rater. Cette fonction ne fait donc rien d'autre que
// répondre "on écrit, ou pas", et elle est pure pour être testable sur
// tous les cas tordus sans envoyer un seul email.
//
// -- LES QUATRE FAÇONS DE SE PLANTER, ET LA PARADE ---------------------
//
// 1. **LA RAFALE DU PREMIER JOUR.** Le jour où on branche ce cron, la
//    table peut contenir des départs anciens. Sans borne d'âge, tout le
//    monde reçoit un email le même matin, dont des gens partis depuis
//    des semaines. C'est le genre d'erreur qui se voit publiquement et
//    qui ne se rattrape pas. D'où `MAX_AGE_JOURS`.
//
// 2. **LE DOUBLE ENVOI.** Deux exécutions qui se chevauchent, ou un
//    réessai. La parade n'est pas ici (c'est la base qui tranche, par un
//    UPDATE conditionnel), mais `asked_at` est lu ici aussi : deux
//    verrous valent mieux qu'un.
//
// 3. **ÉCRIRE À QUELQU'UN QUI EST REVENU.** Elle a annulé sa
//    résiliation, elle paie de nouveau, et elle reçoit "pourquoi tu es
//    partie ?". C'est le pire des quatre : ça donne l'impression que
//    personne ne regarde.
//
// 4. **REDEMANDER À QUELQU'UN QUI A DÉJÀ RÉPONDU.** Quand elle résilie
//    depuis le portail Stripe, Stripe lui demande la raison ET lui
//    laisse écrire un commentaire. Si elle a pris la peine d'écrire, on
//    a ses mots : lui redemander revient à dire qu'on ne l'a pas lue.
//
//    Nuance assumée : si elle a seulement cliqué une raison toute faite
//    ("trop cher"), on écrit quand même. Une case cochée ne dit pas ce
//    qui manquait.

/** On n'écrit pas dans la seconde qui suit le clic. */
export const MIN_DELAI_HEURES = 2;

/**
 * On n'écrit jamais à propos d'un départ qui date.
 *
 * Deux semaines : au delà, l'email arrive comme un reproche tardif, et
 * la réponse ne vaudrait plus grand chose de toute façon.
 */
export const MAX_AGE_JOURS = 14;

/** Combien d'emails au maximum par exécution. */
export const MAX_PAR_PASSAGE = 40;

export interface ChurnAskRow {
  id?: string | null;
  email?: string | null;
  cancelled_at?: string | null;
  asked_at?: string | null;
  answered_at?: string | null;
  reactivated_at?: string | null;
  stripe_comment?: string | null;
  reason?: string | null;
}

export type AskVerdict =
  /** On écrit. */
  | "ask"
  /** Pas d'adresse : on ne peut rien faire. */
  | "no-email"
  /** Pas de date de départ : on ne sait pas si c'est frais. */
  | "no-date"
  /** Le départ est trop récent. */
  | "too-soon"
  /** Le départ date trop : écrire maintenant serait déplacé. */
  | "too-old"
  /** On lui a déjà écrit. */
  | "already-asked"
  /** Elle a annulé sa résiliation. */
  | "came-back"
  /** Elle a déjà écrit ce qu'elle avait à dire. */
  | "already-told";

const HEURE = 3600 * 1000;
const JOUR = 24 * HEURE;

/**
 * Faut-il écrire à cette personne ?
 *
 * `maintenant` est un PARAMÈTRE, jamais un `Date.now()` interne : sinon
 * la fonction n'est pas testable, et un test qui dépend de l'horloge est
 * un test qui clignote (leçon du 1er août).
 *
 * L'ordre des refus n'est pas décoratif : il va du plus définitif au
 * plus temporaire, pour que le journal dise la vraie raison. "Elle est
 * revenue" est une information ; "c'est trop tôt" n'en est pas une.
 */
export function readAskVerdict(row: ChurnAskRow, maintenant: Date): AskVerdict {
  if (!String(row.email ?? "").trim()) return "no-email";
  if (row.asked_at) return "already-asked";
  if (row.reactivated_at) return "came-back";

  // Elle a ÉCRIT quelque chose, chez Stripe ou chez nous. On a ses mots.
  if (String(row.stripe_comment ?? "").trim()) return "already-told";
  if (String(row.reason ?? "").trim()) return "already-told";

  const t = row.cancelled_at ? Date.parse(row.cancelled_at) : Number.NaN;
  if (!Number.isFinite(t)) return "no-date";

  const age = maintenant.getTime() - t;
  // Une date DANS LE FUTUR (horloge décalée, import) compte comme trop
  // récente : on attend plutôt que d'écrire sur une donnée qu'on ne sait
  // pas lire.
  if (age < MIN_DELAI_HEURES * HEURE) return "too-soon";
  if (age > MAX_AGE_JOURS * JOUR) return "too-old";

  return "ask";
}

/**
 * La file d'envoi, bornée.
 *
 * Le plafond n'est pas de la prudence décorative : un fournisseur
 * d'emails limite le débit, et une rafale se traduit par des messages
 * refusés qu'on croirait envoyés. Le reste attend l'exécution suivante,
 * ce qui ne coûte rien puisque le cron tourne tous les jours.
 */
export function buildAskQueue(
  rows: ChurnAskRow[],
  maintenant: Date,
): { aEcrire: ChurnAskRow[]; ecartes: Record<AskVerdict, number> } {
  const ecartes: Record<AskVerdict, number> = {
    ask: 0,
    "no-email": 0,
    "no-date": 0,
    "too-soon": 0,
    "too-old": 0,
    "already-asked": 0,
    "came-back": 0,
    "already-told": 0,
  };
  const aEcrire: ChurnAskRow[] = [];

  for (const row of rows) {
    const verdict = readAskVerdict(row, maintenant);
    ecartes[verdict] += 1;
    if (verdict === "ask" && aEcrire.length < MAX_PAR_PASSAGE) aEcrire.push(row);
  }

  return { aEcrire, ecartes };
}
