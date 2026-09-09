// lib/analytics/parcours.ts
//
// LES CINQ ÉVÉNEMENTS DU PARCOURS, ET PAS UN DE PLUS.
//
// Béné, 9 septembre 2026 : "Cinq chantiers, dans cet ordre. Le point 1
// avant tout : sans mesure, on ne saura pas si le reste a servi."
//
//   quiz_demarre        le visiteur clique la 1re réponse du quiz du hero
//   quiz_termine        l'écran de résultat s'affiche          { profil }
//   generation_lancee   clic sur « Générer ce quiz »           { profil, source }
//   generation_reussie  le quiz s'affiche dans l'éditeur       { duree_ms }
//   compte_cree         il va au bout de l'inscription         { avait_quiz }
//
// "Pas un de plus" est une consigne, pas une approximation. Un tableau
// de bord qui porte trente événements est un tableau qu'on n'ouvre
// plus : le seul ratio qu'elle veut lire chaque semaine est
// `generation_lancee -> compte_cree`, et il ne se lit que si ces deux là
// sont propres.
//
// ── CE MODULE NE PARLE À PERSONNE, ET C'EST VOULU ────────────────────
//
// Il CONSTRUIT les événements, il ne les envoie pas. `gtag` vit dans le
// navigateur, donc une décision enfermée à côté de lui ne serait pas
// testable (règle du 1er août). L'envoi vit dans
// `lib/analytics/envoi.ts`, et il ne décide rien.
//
// C'est exactement la séparation de `lib/analytics/conversions.ts` (les
// deux événements de vente, 4 septembre), et pour la même raison. Les
// deux modules partagent le TYPE et l'ENVOI : deux portes qui
// décideraient chacune de leur côté finiraient par ne plus dire la même
// chose, et c'est le défaut sorti six fois dans ce dépôt.

import { SALES_HOSTS } from "@/lib/sales/salesHosts";

import type { EvenementGa4 } from "@/lib/analytics/conversions";

export type { EvenementGa4 };

/**
 * D'OÙ VIENT LA GÉNÉRATION.
 *
 * Sa définition, mot pour mot : `"hero"` (quiz du hero), `"modeles"`
 * (les six cartes) ou `"direct"` (arrivée sur /generateur-de-quiz sans
 * paramètres).
 */
export type SourceGeneration = "hero" | "modeles" | "direct";

const SOURCES: readonly SourceGeneration[] = ["hero", "modeles", "direct"];

/**
 * LA SOURCE SE LIT SUR L'ADRESSE, ET `generation_lancee` PART DEPUIS LE
 * GÉNÉRATEUR.
 *
 * C'est ce que sa troisième valeur impose : `"direct"` veut dire
 * "arrivée sur /generateur-de-quiz sans paramètres", et ça ne peut se
 * savoir que SUR cette page. L'événement ne part donc pas au clic sur la
 * landing, il part quand la génération démarre vraiment.
 *
 * Ce n'est pas un détail de plomberie, c'est ce qui rend le ratio
 * honnête : un clic qui navigue et repart sans rien générer ne doit pas
 * gonfler le dénominateur de `generation_lancee -> compte_cree`.
 *
 * **Une valeur illisible retombe sur `"direct"`, jamais sur `null`.**
 * Une génération sans source serait une génération absente du tableau,
 * donc un dénominateur trop petit, donc un taux trop beau. Le sens du
 * repli est celui qui SOUS-estime la landing : elle se plaint d'un
 * chiffre trop bas, jamais d'un chiffre inventé.
 */
export function sourceDeLaGeneration(brut: string | null | undefined): SourceGeneration {
  const propre = String(brut ?? "").trim().toLowerCase();
  return (SOURCES as readonly string[]).includes(propre)
    ? (propre as SourceGeneration)
    : "direct";
}

/**
 * Le profil, nettoyé.
 *
 * Il vient du quiz du hero (`L'accompagnateur`, `Le formateur`...) et il
 * voyage dans l'URL jusqu'au générateur. Un profil inconnu ou absent
 * rend `null` : le paramètre est alors OMIS, jamais rendu avec un tiret
 * ou une chaîne vide. GA4 rangerait `"(none)"` à côté des vrais profils
 * et le rapport compterait une septième catégorie qui n'existe pas.
 */
export function profilNettoye(brut: string | null | undefined): string | null {
  const propre = String(brut ?? "").replace(/\s+/g, " ").trim().slice(0, 60);
  return propre.length > 0 ? propre : null;
}

/** N'ajoute une clé que si elle porte vraiment quelque chose. */
function siPresent(params: Record<string, unknown>, cle: string, valeur: unknown) {
  if (valeur === null || valeur === undefined || valeur === "") return params;
  params[cle] = valeur;
  return params;
}

/** ÉTAPE 1 : il clique la première réponse du quiz du hero. */
export function evenementQuizDemarre(): EvenementGa4 {
  return { name: "quiz_demarre", params: {} };
}

/** ÉTAPE 2 : l'écran de résultat s'affiche. */
export function evenementQuizTermine(profil: string | null | undefined): EvenementGa4 {
  return { name: "quiz_termine", params: siPresent({}, "profil", profilNettoye(profil)) };
}

/**
 * ÉTAPE 3 : la génération démarre.
 *
 * C'est le DÉNOMINATEUR du seul ratio qu'elle veut lire. Il part donc au
 * moment où l'appel au modèle est vraiment lancé, pas à l'ouverture du
 * formulaire ni au clic sur la landing.
 */
export function evenementGenerationLancee(a: {
  profil?: string | null;
  source: SourceGeneration;
}): EvenementGa4 {
  const params: Record<string, unknown> = { source: a.source };
  return { name: "generation_lancee", params: siPresent(params, "profil", profilNettoye(a.profil)) };
}

/**
 * ÉTAPE 4 : le quiz s'affiche dans l'éditeur.
 *
 * ── `duree_ms` EST LE CHIFFRE QUI JUSTIFIE LE CHANTIER 3 ─────────────
 *
 * Sa consigne : "Ajoute aussi la durée médiane de `generation_reussie` :
 * c'est le chiffre qui justifiera le chantier 3."
 *
 * Il se mesure du DÉPART DE LA DEMANDE À L'AFFICHAGE, pas du temps de
 * réponse du modèle. Ce que le visiteur vit, c'est l'attente devant son
 * écran : le réseau, le flux et le rendu en font partie. Chronométrer le
 * seul appel Anthropic donnerait un chiffre plus flatteur et faux.
 *
 * Une durée absurde n'est pas envoyée (voir `dureeEnMs`) : une valeur
 * fausse dans une médiane la déplace sans que rien ne le dise.
 *
 * ── `systemeio` VIENT DU CHANTIER 3, ET IL EST FACULTATIF ────────────
 *
 * La question posée pendant l'attente ("tu utilises Systeme.io ?") ne
 * bloque rien : la plupart des générations partiront donc sans réponse.
 * Le paramètre est alors OMIS, ce qui laisse GA4 compter les réponses
 * sur ceux qui ont répondu au lieu de mélanger un "pas répondu" avec un
 * "non".
 */
export type ReponseSystemeIo = "oui" | "non" | "pas-encore";

const REPONSES_SIO: readonly ReponseSystemeIo[] = ["oui", "non", "pas-encore"];

export function reponseSystemeIo(brut: string | null | undefined): ReponseSystemeIo | null {
  const propre = String(brut ?? "").trim().toLowerCase();
  return (REPONSES_SIO as readonly string[]).includes(propre)
    ? (propre as ReponseSystemeIo)
    : null;
}

/**
 * Une durée exploitable, ou `null`.
 *
 * Bornée à une heure : au delà, c'est un onglet resté ouvert ou une
 * horloge qui a bougé, pas une génération. Et `Date.now()` peut RECULER
 * (mise à l'heure du système), donc une durée négative existe vraiment.
 * Les deux cas rendent `null` plutôt qu'un chiffre : une médiane se
 * calcule sur ce qui a été vécu, pas sur ce qui a été mal mesuré.
 */
export const DUREE_MAX_MS = 3600_000;

export function dureeEnMs(brut: unknown): number | null {
  // `Number(null)` vaut ZÉRO, et `Number("")` aussi : un `Number(brut)`
  // nu transformait donc "je n'ai pas mesuré" en "génération
  // instantanée". C'est le faux zéro que `mesureDeDuree` compte à part
  // côté base (9 septembre), et il rentrait par la porte de GA4.
  // On n'accepte donc qu'un nombre, ou une chaîne qui porte vraiment
  // quelque chose.
  let n: number;
  if (typeof brut === "number") n = brut;
  else if (typeof brut === "string" && brut.trim() !== "") n = Number(brut);
  else return null;
  if (!Number.isFinite(n)) return null;
  const arrondi = Math.round(n);
  if (arrondi < 0 || arrondi > DUREE_MAX_MS) return null;
  return arrondi;
}

export function evenementGenerationReussie(a: {
  dureeMs: unknown;
  source?: SourceGeneration;
  profil?: string | null;
  systemeio?: string | null;
}): EvenementGa4 {
  const params: Record<string, unknown> = {};
  siPresent(params, "duree_ms", dureeEnMs(a.dureeMs));
  siPresent(params, "source", a.source);
  siPresent(params, "profil", profilNettoye(a.profil));
  siPresent(params, "systemeio", reponseSystemeIo(a.systemeio));
  return { name: "generation_reussie", params };
}

/**
 * ÉTAPE 5 : il va au bout de l'inscription.
 *
 * ── `avait_quiz` EST UN BOOLÉEN, ET IL EST OBLIGATOIRE ───────────────
 *
 * C'est le NUMÉRATEUR du seul ratio qu'elle veut lire, et il ne veut
 * rien dire sans lui : une inscription qui arrive par la page de
 * connexion n'a rien à voir avec une inscription qui vient sauver un
 * quiz déjà écrit. Le paramètre est donc requis par le compilateur, pas
 * deviné à l'intérieur (règle du 1er août).
 */
export function evenementCompteCree(a: { avaitQuiz: boolean }): EvenementGa4 {
  return { name: "compte_cree", params: { avait_quiz: a.avaitQuiz === true } };
}

/**
 * LES DEUX CLÉS QUE L'ADRESSE DU GÉNÉRATEUR PORTE POUR LA MESURE.
 *
 * Nommées ICI et une seule fois : le constructeur de lien de la landing
 * (chantier 4) et le lecteur de cette page doivent écrire et lire le
 * même mot. Deux orthographes ne casseraient rien, elles rendraient
 * juste toutes les générations `"direct"` et sans profil, en silence.
 */
export const CLE_SOURCE = "source";
export const CLE_PROFIL = "profil";

export interface ParcoursDeLAdresse {
  source: SourceGeneration;
  profil: string | null;
}

/**
 * CE QUE L'ADRESSE DIT DU PARCOURS, ET RIEN DE PLUS.
 *
 * Pure : elle prend la chaîne de recherche (`window.location.search`),
 * pas `window`. La lecture du navigateur reste une ligne dans le
 * composant, la DÉCISION se teste ici.
 *
 * Une adresse sans paramètre rend `{ source: "direct", profil: null }`,
 * c'est à dire exactement l'état d'aujourd'hui, avant que la landing ne
 * pose ses liens.
 */
export function parcoursDeLAdresse(recherche: string | null | undefined): ParcoursDeLAdresse {
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(String(recherche ?? ""));
  } catch {
    return { source: "direct", profil: null };
  }
  return {
    source: sourceDeLaGeneration(params.get(CLE_SOURCE)),
    profil: profilNettoye(params.get(CLE_PROFIL)),
  };
}

/**
 * EST-ON SUR UN DOMAINE DE VENTE ?
 *
 * `chargerAnalytics` prend `estHoteDeVente` en paramètre parce que la
 * liste vit dans `lib/sales/salesHosts.ts` et que deux listes qui disent
 * la même chose finissent toujours par diverger. Les pages serveur la
 * passent en prop ; un gestionnaire de clic, lui, n'a que le navigateur.
 *
 * Cette fonction LIT donc la même table, elle n'en écrit pas une
 * deuxième. Elle est pure (elle prend le nom d'hôte, pas `window`), donc
 * elle se teste.
 */
export function estHoteDeVenteClient(hostname: string | null | undefined): boolean {
  const propre = String(hostname ?? "").trim().toLowerCase().split(":")[0];
  return Object.prototype.hasOwnProperty.call(SALES_HOSTS, propre);
}
