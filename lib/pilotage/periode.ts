// lib/pilotage/periode.ts
//
// CHOISIR SA PÉRIODE, PARTOUT (Béné, 29 août 2026).
//
// "Sur Systeme.io je peux choisir la période dont je veux l'aperçu dès
// l'accueil. Fais vraiment un truc intelligent qui me permet de bien
// voir ce que je veux quand je veux, partout."
//
// -- TROIS DÉCISIONS, ET AUCUNE N'EST COSMÉTIQUE ----------------------
//
// 1. LA PÉRIODE VIT DANS L'URL, pas dans l'état d'un composant. Une vue
//    se garde en favori, se recharge sans se réinitialiser, et se
//    partage telle quelle. Un état interne se perd au premier F5, et on
//    finit par ne plus s'en servir.
//
// 2. ELLE S'APPLIQUE À TOUT L'ÉCRAN, ou à rien. Un sélecteur qui ne
//    déplacerait que le graphique pendant que les compteurs du haut
//    parlent d'autre chose est pire que pas de sélecteur : les deux
//    chiffres sont sur la même page et on croit qu'ils parlent de la
//    même chose.
//
// 3. ON DIT JUSQU'OÙ LA DONNÉE VA. Le journal des encaissements ne
//    remonte qu'au 7 août 2026 (il n'existait pas avant). Demander
//    "12 mois" ne peut donc pas rendre 12 mois, et un écran qui
//    afficherait un total tronqué sans le dire ferait prendre des
//    décisions sur un chiffre faux. C'est la règle du 8 juin : on
//    n'affiche pas un total dont le dénominateur ment.
//
// PUR : `maintenant` est un paramètre. Un calcul qui lit l'horloge tout
// seul n'est pas testable, et un test qui dépend de l'heure clignote.

export type PeriodeId =
  | "7j"
  | "30j"
  | "ce-mois"
  | "mois-dernier"
  | "90j"
  | "12m"
  | "tout"
  | "sur-mesure";

export interface Periode {
  id: PeriodeId;
  /** Inclus. `null` = depuis le début de ce qu'on a. */
  debut: string | null;
  /** Inclus. `null` = jusqu'à maintenant. */
  fin: string | null;
  libelle: string;
}

const JOUR = 24 * 60 * 60 * 1000;

/** Le jour d'une date, en AAAA-MM-JJ, en UTC. */
function jour(t: number): string {
  return new Date(t).toISOString().slice(0, 10);
}

/** Les choix proposés, dans l'ordre où ils s'affichent. */
export const CHOIX_PERIODE: readonly { id: PeriodeId; libelle: string }[] = [
  { id: "7j", libelle: "7 derniers jours" },
  { id: "30j", libelle: "30 derniers jours" },
  { id: "ce-mois", libelle: "Ce mois" },
  { id: "mois-dernier", libelle: "Mois dernier" },
  { id: "90j", libelle: "3 derniers mois" },
  { id: "12m", libelle: "12 derniers mois" },
  { id: "tout", libelle: "Depuis le début" },
];

export const PERIODE_DEFAUT: PeriodeId = "30j";

/** La période nommée par cet identifiant, résolue en dates. */
export function resoudrePeriode(id: PeriodeId, maintenant: Date): Periode {
  const t = maintenant.getTime();
  const libelle = CHOIX_PERIODE.find((c) => c.id === id)?.libelle ?? "Période";

  switch (id) {
    case "7j":
      return { id, debut: jour(t - 6 * JOUR), fin: jour(t), libelle };
    case "30j":
      return { id, debut: jour(t - 29 * JOUR), fin: jour(t), libelle };
    case "90j":
      return { id, debut: jour(t - 89 * JOUR), fin: jour(t), libelle };
    case "12m": {
      const d = new Date(maintenant);
      d.setUTCMonth(d.getUTCMonth() - 11, 1);
      return { id, debut: jour(d.getTime()), fin: jour(t), libelle };
    }
    case "ce-mois": {
      const d = new Date(Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth(), 1));
      return { id, debut: jour(d.getTime()), fin: jour(t), libelle };
    }
    case "mois-dernier": {
      const debut = new Date(
        Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth() - 1, 1),
      );
      // Le dernier jour du mois précédent : le jour 0 du mois courant.
      const fin = new Date(Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth(), 0));
      return { id, debut: jour(debut.getTime()), fin: jour(fin.getTime()), libelle };
    }
    case "tout":
    default:
      return { id: "tout", debut: null, fin: null, libelle: "Depuis le début" };
  }
}

/**
 * La période demandée par l'URL.
 *
 * Une valeur illisible retombe sur le défaut SANS rien dire : un écran
 * qui refuserait de s'afficher parce qu'un paramètre est de travers est
 * un écran qu'on ne peut plus ouvrir depuis un vieux favori.
 *
 * Des dates sur mesure gagnent sur l'identifiant : c'est le choix le
 * plus précis, donc le plus intentionnel.
 */
export function lirePeriode(
  params: { get(cle: string): string | null },
  maintenant: Date,
): Periode {
  const debut = normaliserJour(params.get("debut"));
  const fin = normaliserJour(params.get("fin"));
  if (debut || fin) {
    // ON REMET LES BORNES DANS L'ORDRE plutôt que de refuser. Quelqu'un
    // qui tape le 31 puis le 1er veut évidemment ce mois là, pas un
    // message d'erreur.
    const [d, f] = debut && fin && debut > fin ? [fin, debut] : [debut, fin];
    return {
      id: "sur-mesure",
      debut: d,
      fin: f,
      libelle: libelleSurMesure(d, f),
    };
  }
  const brut = String(params.get("periode") ?? "").trim();
  const connu = CHOIX_PERIODE.find((c) => c.id === brut)?.id ?? PERIODE_DEFAUT;
  return resoudrePeriode(connu, maintenant);
}

/** Une date AAAA-MM-JJ, ou `null` si elle n'en est pas une. */
export function normaliserJour(brut: unknown): string | null {
  const v = String(brut ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const t = Date.parse(`${v}T00:00:00Z`);
  return Number.isFinite(t) ? v : null;
}

function fr(j: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${j}T00:00:00Z`));
}

function libelleSurMesure(debut: string | null, fin: string | null): string {
  if (debut && fin) return `Du ${fr(debut)} au ${fr(fin)}`;
  if (debut) return `Depuis le ${fr(debut)}`;
  if (fin) return `Jusqu'au ${fr(fin)}`;
  return "Depuis le début";
}

/**
 * Cette date tombe-t-elle dans la période ?
 *
 * Les deux bornes sont INCLUSES : "du 1er au 31" doit contenir le 31,
 * sinon le dernier jour du mois manque à tous les totaux et personne ne
 * le remarque avant de comparer avec sa banque.
 */
export function dansLaPeriode(iso: string | null | undefined, p: Periode): boolean {
  const v = String(iso ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  if (p.debut && v < p.debut) return false;
  if (p.fin && v > p.fin) return false;
  return true;
}

/**
 * Le nombre de mois que la période couvre, pour dimensionner le
 * graphique. Au moins 1, au plus 24 : au delà, douze colonnes de plus
 * n'apprennent rien et le graphique devient illisible.
 */
export function moisCouverts(p: Periode, maintenant: Date): number {
  if (!p.debut) return 12;
  const d = new Date(`${p.debut}T00:00:00Z`);
  const f = p.fin ? new Date(`${p.fin}T00:00:00Z`) : maintenant;
  const mois =
    (f.getUTCFullYear() - d.getUTCFullYear()) * 12 + (f.getUTCMonth() - d.getUTCMonth()) + 1;
  return Math.min(24, Math.max(1, mois));
}

/**
 * La période demandée commence-t-elle AVANT que la donnée existe ?
 *
 * Le journal des encaissements a été posé le 7 août 2026. Demander
 * "12 mois" ne peut donc pas rendre 12 mois, et un total tronqué qui ne
 * le dit pas fait prendre des décisions sur un chiffre faux.
 */
export const DEBUT_DU_JOURNAL = "2026-08-07";

export function tronqueeParLeJournal(p: Periode, debutJournal = DEBUT_DU_JOURNAL): boolean {
  return p.debut === null || p.debut < debutJournal;
}

/** L'URL d'une période, pour qu'un lien la porte. */
export function versQuery(p: Periode): string {
  if (p.id === "sur-mesure") {
    const bits: string[] = [];
    if (p.debut) bits.push(`debut=${p.debut}`);
    if (p.fin) bits.push(`fin=${p.fin}`);
    return bits.join("&");
  }
  return `periode=${p.id}`;
}
