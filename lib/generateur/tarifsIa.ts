// lib/generateur/tarifsIa.ts
//
// CE QUE COÛTE UN QUIZ ÉCRIT PAR L'IA, EN DOLLARS.
//
// Béné, 8 septembre 2026 : "et le ROI". Pour le calculer il faut un
// prix, et un prix se PÉRIME : Anthropic change ses tarifs, et un
// modèle change de famille. D'où la même mécanique que `TAUX_UE`
// (`lib/facture/tva.ts`, 24 août) : une table, une DATE de relevé, et
// une vérification une fois par an.
//
// ── ON NE CONVERTIT PAS LES DEVISES ──────────────────────────────────
//
// Anthropic facture en DOLLARS, Tiquiz encaisse en EUROS. Convertir
// demanderait un taux de change inventé, faux le lendemain : c'est la
// règle du 1er septembre, posée pour les prix de Typeform et de Zapier
// sur le blog, et elle vaut ici pour la même raison.
//
// L'écran affiche donc un coût en dollars À CÔTÉ d'un revenu en euros,
// et il le DIT. Un ratio qui mélangerait les deux serait un chiffre
// faux qui a l'air juste, c'est à dire celui qui fait dépenser.
//
// ── UN MODÈLE INCONNU RÉPOND `null`, JAMAIS UN PRIX APPROCHÉ ─────────
//
// La famille Opus est passée de 15 $ / 75 $ à 5 $ / 25 $ par million de
// jetons : appliquer le tarif d'aujourd'hui à un modèle plus ancien
// diviserait son coût par trois, en silence. On ne reconnaît donc que
// les modèles dont le tarif a été RELEVÉ, et le reste rend `null`.

/**
 * La date du relevé. À revérifier une fois par an sur la page de tarifs
 * d'Anthropic, exactement comme `TAUX_MAJ` de la TVA européenne : un
 * tarif faux ne se voit sur aucun écran, il se voit sur la facture.
 */
export const TARIFS_MAJ = "2026-06-24";

/** Prix en dollars par MILLION de jetons. */
interface Tarif {
  entree: number;
  sortie: number;
}

/**
 * La table, par PRÉFIXE d'identifiant de modèle : les identifiants
 * portent souvent une date (`claude-haiku-4-5-20251001`), et l'écrire
 * en dur ferait rendre `null` au lendemain d'un renommage.
 *
 * L'ordre compte : le préfixe le plus LONG gagne, sinon
 * `claude-opus-5` attraperait aussi `claude-opus-5-1` si leurs tarifs
 * venaient à différer.
 */
const TARIFS: ReadonlyArray<readonly [string, Tarif]> = [
  ["claude-opus-5", { entree: 5, sortie: 25 }],
  ["claude-opus-4-8", { entree: 5, sortie: 25 }],
  ["claude-opus-4-7", { entree: 5, sortie: 25 }],
  ["claude-opus-4-6", { entree: 5, sortie: 25 }],
  ["claude-sonnet-5", { entree: 2, sortie: 10 }],
  ["claude-sonnet-4-6", { entree: 3, sortie: 15 }],
  ["claude-haiku-4-5", { entree: 1, sortie: 5 }],
  ["claude-fable-5-1", { entree: 10, sortie: 50 }],
  ["claude-fable-5", { entree: 10, sortie: 50 }],
  ["claude-mythos-5-1", { entree: 10, sortie: 50 }],
];

/** Le tarif d'un modèle, ou `null` si on ne l'a pas relevé. */
export function tarifDuModele(modele: string | null | undefined): Tarif | null {
  const m = (modele ?? "").trim().toLowerCase();
  if (!m) return null;
  let trouve: Tarif | null = null;
  let longueur = -1;
  for (const [prefixe, tarif] of TARIFS) {
    if (m.startsWith(prefixe) && prefixe.length > longueur) {
      trouve = tarif;
      longueur = prefixe.length;
    }
  }
  return trouve;
}

/**
 * Le coût d'un appel, en MILLIÈMES de cent de dollar.
 *
 * Pourquoi des millièmes : un quiz coûte quelques centimes, et une
 * addition d'arrondis au cent ferait disparaître les petites lignes.
 * On arrondit UNE fois, à l'affichage, sur la somme.
 *
 * `null` = le modèle n'est pas dans la table, donc on ne sait pas. Ce
 * n'est PAS un coût de zéro, et l'appelant doit pouvoir dire la
 * différence : une génération gratuite et une génération dont on ignore
 * le prix ne se lisent pas pareil.
 */
export function coutMillicents(
  modele: string | null | undefined,
  jetonsEntree: number | null | undefined,
  jetonsSortie: number | null | undefined,
): number | null {
  const tarif = tarifDuModele(modele);
  if (!tarif) return null;
  const e = Number(jetonsEntree);
  const s = Number(jetonsSortie);
  if (!Number.isFinite(e) || !Number.isFinite(s) || e < 0 || s < 0) return null;
  // dollars = jetons / 1e6 * prix ; millicents = dollars * 100 000.
  const dollars = (e / 1_000_000) * tarif.entree + (s / 1_000_000) * tarif.sortie;
  return Math.round(dollars * 100_000);
}

/** Un montant en millièmes de cent, écrit en dollars. */
export function dollars(millicents: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(millicents / 100_000);
}
