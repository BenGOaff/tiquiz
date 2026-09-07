// lib/trafic/entonnoir.ts
//
// TRAFIC ET VENTES SUR LE MÊME ÉCRAN (Béné, 4 septembre 2026, point 3).
//
// Trois marches, et les trois viennent de NOS données, exactes :
//
//   1. les vues du site public       -> `trafic_jour` (depuis le 7 sept.)
//   2. les vues d'un bon de commande -> les mêmes lignes, chemin `/commande/*`
//   3. les ventes encaissées         -> `resumePeriode`, la MÊME source
//                                       que l'écran Ventes
//
// La marche 2 est celle que GA4 appelle `begin_checkout`, et on l'a ici
// SANS dépendre de GA4 ni du consentement : c'est une vue de page comme
// une autre. Les trois marches se comptent donc sur la même population,
// ce qui est la seule façon d'en tirer un taux qui veuille dire quelque
// chose.
//
// -- ON NE RECALCULE PAS LES VENTES ------------------------------------
//
// Le nombre de ventes est PASSÉ à ce module, il n'est pas recalculé
// dedans. `resumePeriode` est la source de l'écran Ventes et du résumé
// de l'accueil : en refaire un compte ici donnerait deux chiffres pour
// la même chose, et c'est le défaut que ce dépôt paie en boucle.
//
// -- UN TAUX SUR TROIS VUES N'EST PAS UN TAUX --------------------------
//
// C'est la leçon du funnel de Jocelyne (4 août) : à un dénominateur trop
// petit, une seule personne fait bouger le pourcentage de plusieurs
// points, et on prend une variation de hasard pour un signal. En dessous
// de `MIN_VUES_POUR_UN_TAUX`, on rend `null` et l'écran DIT "pas encore
// assez de vues", au lieu d'afficher un chiffre qu'il faudrait ignorer.
//
// Les COMPTES, eux, sont toujours rendus : ils sont exacts dès la
// première vue, et cacher les trois nombres parce que le taux n'est pas
// mûr serait cacher la seule chose qu'on sait.

/** Une ligne de `trafic_jour`, telle qu'elle est lue. */
export interface LigneTrafic {
  jour: string;
  chemin: string;
  source: string;
  vues: number;
}

/**
 * En dessous, aucun taux n'est affiché.
 *
 * 100 vues : une vente y vaut 1 point. À 20 vues elle en vaudrait 5, et
 * le taux sauterait de 5 points à chaque vente, donc il ne dirait rien
 * du site et tout du hasard.
 */
export const MIN_VUES_POUR_UN_TAUX = 100;

export interface Entonnoir {
  vues: number;
  vuesCommande: number;
  ventes: number;
  /** En pourcentage, une décimale. `null` = pas encore assez de vues. */
  tauxVersCommande: number | null;
  tauxCommandeVersVente: number | null;
  tauxGlobal: number | null;
}

/** Un taux en %, à une décimale, ou `null` si le dénominateur est trop maigre. */
function taux(numerateur: number, denominateur: number, minimum: number): number | null {
  if (denominateur < minimum || denominateur <= 0) return null;
  return Math.round((numerateur / denominateur) * 1000) / 10;
}

/** Le chemin est-il un bon de commande ? */
export function estUnBonDeCommande(chemin: string): boolean {
  // `/commande/mensuel`, et pas `/commande/mensuel/retour` : la page de
  // retour n'est atteinte QU'APRÈS avoir payé. La compter comme une
  // entrée dans le tunnel ferait un taux de passage artificiellement
  // haut, et surtout elle compte déjà comme une vente.
  return /^\/commande\/[^/]+$/.test(chemin);
}

export function construireEntonnoir(args: {
  lignes: readonly LigneTrafic[];
  /** Le nombre de ventes de la période, venu de `resumePeriode`. */
  ventes: number;
}): Entonnoir {
  let vues = 0;
  let vuesCommande = 0;
  for (const l of args.lignes) {
    const n = Number(l.vues) || 0;
    vues += n;
    if (estUnBonDeCommande(l.chemin)) vuesCommande += n;
  }
  return {
    vues,
    vuesCommande,
    ventes: args.ventes,
    tauxVersCommande: taux(vuesCommande, vues, MIN_VUES_POUR_UN_TAUX),
    // Le second taux se juge sur les vues de bon de commande, qui sont
    // bien plus rares que les vues du site : exiger 100 ici le rendrait
    // invisible pendant des mois. Le seuil est donc le DIXIÈME, et il
    // reste au dessus de "une personne fait tout basculer".
    tauxCommandeVersVente: taux(args.ventes, vuesCommande, Math.round(MIN_VUES_POUR_UN_TAUX / 10)),
    tauxGlobal: taux(args.ventes, vues, MIN_VUES_POUR_UN_TAUX),
  };
}

/** Un classement, du plus vu au moins vu, coupé à `combien`. */
function classer(par: Map<string, number>, combien: number): { cle: string; vues: number }[] {
  return [...par.entries()]
    .map(([cle, vues]) => ({ cle, vues }))
    .sort((a, b) => b.vues - a.vues || a.cle.localeCompare(b.cle))
    .slice(0, combien);
}

/** Les pages les plus vues. */
export function pagesLesPlusVues(lignes: readonly LigneTrafic[], combien = 12) {
  const par = new Map<string, number>();
  for (const l of lignes) par.set(l.chemin, (par.get(l.chemin) ?? 0) + (Number(l.vues) || 0));
  return classer(par, combien);
}

/**
 * D'où vient le monde.
 *
 * `interne` est ÉCARTÉ : c'est une navigation d'une de nos pages vers
 * une autre, donc elle n'a amené personne. La laisser dans le classement
 * la mettrait presque toujours en tête et masquerait les vraies sources,
 * qui sont la seule chose que ce tableau doit dire.
 */
export function sourcesDuTrafic(lignes: readonly LigneTrafic[], combien = 10) {
  const par = new Map<string, number>();
  for (const l of lignes) {
    if (l.source === "interne") continue;
    par.set(l.source, (par.get(l.source) ?? 0) + (Number(l.vues) || 0));
  }
  return classer(par, combien);
}

/** Les vues par jour, dans l'ordre, pour la courbe. */
export function vuesParJour(lignes: readonly LigneTrafic[]): { jour: string; vues: number }[] {
  const par = new Map<string, number>();
  for (const l of lignes) par.set(l.jour, (par.get(l.jour) ?? 0) + (Number(l.vues) || 0));
  return [...par.entries()]
    .map(([jour, vues]) => ({ jour, vues }))
    .sort((a, b) => a.jour.localeCompare(b.jour));
}
