// lib/generateur/entonnoirGenerateur.ts
//
// QUI ENTRE PAR LE GÉNÉRATEUR, ET CE QU'IL DEVIENT.
//
// Béné, 8 septembre 2026 : "dans admin, fais moi apparaitre qui entre
// par le générateur dans mes contacts et dans les stat comment le
// générateur convertit : visites / inscrits gratos / abonnés et le ROI".
//
// Quatre marches, et les quatre viennent de NOS données :
//
//   1. les visites  -> `trafic_jour`, chemin `/generateur-de-quiz`
//   2. les quiz     -> `embed_quiz_sessions` créées sur cette page
//   3. les inscrits -> `claimed_by_user_id` (le quiz a été rattaché)
//   4. les abonnés  -> le `plan` de ces comptes
//
// ── LE DÉNOMINATEUR ET LE NUMÉRATEUR PARLENT DE LA MÊME PAGE ─────────
//
// C'est la règle qui rend ce tableau honnête, et c'est exactement le
// défaut corrigé le 7 septembre sur l'entonnoir des ventes (les vues de
// tiquiz.fr divisées par les ventes des DEUX sites).
//
// Le générateur est servi à DEUX endroits : sa page dédiée, et l'iframe
// de la page de vente. Les deux écrivent une `source` différente
// (`page-generateur` contre `tiquiz-fr`). Diviser TOUS les quiz générés
// par les vues de la seule page dédiée gonflerait le taux, et rien ne
// le dirait.
//
// L'entonnoir ne compte donc que les générations de la page dédiée. Ce
// que l'iframe apporte se lit à côté, en COMPTES, sans aucun taux :
// personne ne compte les vues de l'iframe, donc il n'y a pas de
// dénominateur à lui donner, et en inventer un serait pire que se taire.
//
// ── LE COÛT EST UNE ESTIMATION, ET IL EST EN DOLLARS ─────────────────
//
// Il se calcule à partir des jetons ÉCRITS EN BASE et de la table de
// tarifs (`tarifsIa.ts`, avec sa date de relevé). Anthropic facture en
// dollars, Tiquiz encaisse en euros, et on ne convertit pas : voir la
// note de `tarifsIa.ts`.
//
// ── UN TAUX SUR TROIS PERSONNES N'EST PAS UN TAUX ────────────────────
//
// Même règle que l'entonnoir des ventes, et même seuil : en dessous, on
// rend `null` et l'écran DIT "pas encore assez". Les COMPTES, eux,
// s'affichent toujours : ils sont exacts dès la première ligne.

import { isPaidPlan } from "@/lib/planLimits";
import { coutMillicents } from "@/lib/generateur/tarifsIa";
import { CHEMIN_GENERATEUR, SOURCE_GENERATEUR } from "@/lib/site/generateurQuiz";
import { MIN_VUES_POUR_UN_TAUX, type LigneTrafic } from "@/lib/trafic/entonnoir";

/** Une session de génération, telle qu'elle est lue. */
export interface LigneGeneration {
  /** D'où le générateur a été ouvert. `null` = ligne trop ancienne. */
  source: string | null;
  /**
   * Le compte qui a réclamé le quiz, ou `null`.
   *
   * UN SEUL CHAMP, ET PAS UN BOOLÉEN À CÔTÉ : "réclamée" n'est rien
   * d'autre que "ce champ n'est pas nul", et deux champs qui disent la
   * même chose finissent par ne plus être d'accord.
   */
  compte: string | null;
  /** Le plan de ce compte. `null` = pas réclamé, ou plan illisible. */
  plan: string | null;
  modele: string | null;
  jetonsEntree: number | null;
  jetonsSortie: number | null;
}

/**
 * Le plancher du deuxième et du troisième taux.
 *
 * Un quiz généré est bien plus rare qu'une vue, et une inscription plus
 * rare encore : exiger 100 rendrait ces deux taux invisibles pendant
 * des mois. C'est le même dixième que l'entonnoir des ventes utilise
 * pour son "bon de commande -> vente", et il reste au dessus de "une
 * personne fait tout basculer".
 */
export const MIN_POUR_UN_TAUX_AVAL = Math.round(MIN_VUES_POUR_UN_TAUX / 10);

export interface EntonnoirGenerateur {
  vues: number;
  quiz: number;
  inscrits: number;
  abonnes: number;
  /** En pourcentage, une décimale. `null` = pas encore assez de monde. */
  tauxVersQuiz: number | null;
  tauxVersInscription: number | null;
  tauxVersAbonnement: number | null;
  /** Le coût des générations comptées ici, en millièmes de cent de dollar. */
  coutMillicents: number;
  /**
   * Combien de générations n'ont AUCUN coût calculable.
   *
   * Deux cas, et ils ne se confondent pas avec un coût de zéro : la
   * ligne est antérieure au 8 septembre (aucun jeton n'était écrit), ou
   * son modèle n'est pas dans la table de tarifs. L'écran doit le dire,
   * sinon le total se lit comme le coût complet.
   */
  coutInconnu: number;
  /** `null` quand personne ne s'est inscrit : on ne divise pas par zéro. */
  coutParInscritMillicents: number | null;
  coutParAbonneMillicents: number | null;
}

/** Un taux en %, à une décimale, ou `null` si le dénominateur est trop maigre. */
function taux(numerateur: number, denominateur: number, minimum: number): number | null {
  if (denominateur < minimum || denominateur <= 0) return null;
  return Math.round((numerateur / denominateur) * 1000) / 10;
}

/**
 * Les vues de la page du générateur.
 *
 * Comparaison EXACTE sur le chemin, jamais un préfixe : `/generateur-de-quiz`
 * et une future page `/generateur-de-quiz-pro` seraient deux pages, et
 * les additionner rendrait le taux faux le jour où la seconde existe.
 * Le chemin vient du module qui sert la page, il n'est pas recopié.
 */
export function vuesDuGenerateur(lignes: readonly LigneTrafic[]): number {
  let n = 0;
  for (const l of lignes) {
    if (l.chemin === CHEMIN_GENERATEUR) n += Number(l.vues) || 0;
  }
  return n;
}

/** Ce qu'un lot de générations a coûté, et ce qu'on ne sait pas chiffrer. */
function additionnerLeCout(generations: readonly LigneGeneration[]): {
  millicents: number;
  inconnu: number;
} {
  let millicents = 0;
  let inconnu = 0;
  for (const g of generations) {
    const c = coutMillicents(g.modele, g.jetonsEntree, g.jetonsSortie);
    if (c === null) inconnu += 1;
    else millicents += c;
  }
  return { millicents, inconnu };
}

/** Le compte est-il payant ? La règle vit dans `planLimits`, on ne la réécrit pas. */
function estAbonne(g: LigneGeneration): boolean {
  return g.compte !== null && isPaidPlan(g.plan);
}

export function construireEntonnoirGenerateur(args: {
  lignesTrafic: readonly LigneTrafic[];
  generations: readonly LigneGeneration[];
}): EntonnoirGenerateur {
  const vues = vuesDuGenerateur(args.lignesTrafic);
  // SEULES LES GÉNÉRATIONS DE CETTE PAGE, sinon le taux ment.
  const duGenerateur = args.generations.filter((g) => g.source === SOURCE_GENERATEUR);
  const inscrits = duGenerateur.filter((g) => g.compte !== null).length;
  const abonnes = duGenerateur.filter(estAbonne).length;
  const cout = additionnerLeCout(duGenerateur);

  return {
    vues,
    quiz: duGenerateur.length,
    inscrits,
    abonnes,
    tauxVersQuiz: taux(duGenerateur.length, vues, MIN_VUES_POUR_UN_TAUX),
    tauxVersInscription: taux(inscrits, duGenerateur.length, MIN_POUR_UN_TAUX_AVAL),
    tauxVersAbonnement: taux(abonnes, inscrits, MIN_POUR_UN_TAUX_AVAL),
    coutMillicents: cout.millicents,
    coutInconnu: cout.inconnu,
    coutParInscritMillicents: inscrits > 0 ? Math.round(cout.millicents / inscrits) : null,
    coutParAbonneMillicents: abonnes > 0 ? Math.round(cout.millicents / abonnes) : null,
  };
}

export interface LigneSource {
  source: string;
  quiz: number;
  inscrits: number;
  abonnes: number;
  coutMillicents: number;
  coutInconnu: number;
}

/**
 * Ce que chaque porte d'entrée apporte, en COMPTES.
 *
 * Aucun taux ici, et c'est délibéré : on ne mesure les vues que de la
 * page dédiée. Afficher un pourcentage pour l'iframe demanderait un
 * dénominateur qu'on n'a pas, et l'inventer serait exactement le chiffre
 * gonflé que ce tableau existe pour éviter.
 *
 * Une source absente est rangée sous `inconnue` : les lignes créées
 * avant que `source` ne soit écrite n'en portent aucune, et les faire
 * disparaître ferait un total qui ne correspond à rien.
 */
export function repartitionParSource(generations: readonly LigneGeneration[]): LigneSource[] {
  const par = new Map<string, LigneGeneration[]>();
  for (const g of generations) {
    const cle = (g.source ?? "").trim() || "inconnue";
    const lot = par.get(cle);
    if (lot) lot.push(g);
    else par.set(cle, [g]);
  }
  return [...par.entries()]
    .map(([source, lot]) => {
      const cout = additionnerLeCout(lot);
      return {
        source,
        quiz: lot.length,
        inscrits: lot.filter((g) => g.compte !== null).length,
        abonnes: lot.filter(estAbonne).length,
        coutMillicents: cout.millicents,
        coutInconnu: cout.inconnu,
      };
    })
    .sort((a, b) => b.quiz - a.quiz || a.source.localeCompare(b.source));
}

/**
 * LES COMPTES ENTRÉS PAR LE GÉNÉRATEUR.
 *
 * Béné, 8 septembre : "fais moi apparaitre qui entre par le générateur
 * dans mes contacts".
 *
 * TOUTES LES SOURCES, contrairement à l'entonnoir : quelqu'un arrivé
 * par l'iframe de la page de vente est entré par le générateur tout
 * autant que celui qui a ouvert la page dédiée. C'est l'entonnoir qui
 * doit filtrer, parce que lui divise par un dénominateur ; une pastille
 * sur une fiche client ne divise rien.
 */
export function comptesDuGenerateur(generations: readonly LigneGeneration[]): Set<string> {
  const comptes = new Set<string>();
  for (const g of generations) {
    if (g.compte) comptes.add(g.compte);
  }
  return comptes;
}

/**
 * L'ensemble à passer à `buildPeople`, ou RIEN si on n'a pas pu lire.
 *
 * C'est la moitié qui décide de l'honnêteté de la pastille, et elle
 * vivait dans la route, donc hors de portée de tout test : un ensemble
 * VIDE fabriqué sur une lecture ratée se lit "personne n'entre par le
 * générateur", ce qui envoie chercher un trafic manquant au lieu d'une
 * panne (règle du 23 août). `undefined` laisse l'écran dire "je n'ai
 * pas pu regarder".
 *
 * Le type est STRUCTUREL et pas importé du lecteur : celui-ci tire
 * `supabaseAdmin`, qui lève au chargement, donc aucun test ne pourrait
 * charger ce module s'il en dépendait.
 */
export function comptesDuGenerateurSiLisible(
  lecture:
    | { lisible: true; generations: readonly LigneGeneration[] }
    | { lisible: false },
): ReadonlySet<string> | undefined {
  return lecture.lisible ? comptesDuGenerateur(lecture.generations) : undefined;
}
