// lib/generateur/prefillUrl.ts
//
// LE CONTRAT D'URL DU GÉNÉRATEUR : ce qu'un lien porte, et qui le lit.
//
// Béné, 9 septembre 2026 : « /generateur-de-quiz ne lit aucun paramètre
// aujourd'hui. Sans ça, les six boutons "Générer ce quiz" de la landing
// et ceux du quiz du hero ne mènent nulle part. »
//
// Mesuré avant d'écrire une ligne : la page acceptait `session`,
// `source` et `lang`, et `EmbedPreviewClient` n'avait AUCUN lecteur
// d'adresse au montage. Un lien qui portait un brief atterrissait donc
// sur un formulaire VIDE, et le visiteur ne voyait pas que quelque
// chose s'était perdu.
//
// ── UN SEUL MODULE ÉCRIT LE LIEN ET LE LIT ───────────────────────────
//
// `lienGenerateur` fabrique, `lirePrefill` relit. Deux listes de noms
// écrites séparément finissent toujours par diverger, et ici le
// symptôme serait le pire possible : le formulaire s'ouvre vide, tout
// marche, personne ne voit rien.
//
// ── ET C'EST PUR, PAS UN HOOK ────────────────────────────────────────
//
// Le brief proposait `usePrefillUrl()` avec `useSearchParams`. La
// DÉCISION vit ici, en fonction pure qui prend la chaîne de recherche
// (pas `window`), exactement comme `parcoursDeLAdresse` : une règle
// enfermée dans un composant React n'est pas testable, donc elle n'est
// pas testée (règle du 1er août). La lecture du navigateur reste une
// ligne dans le composant.
//
// Effet de bord voulu : `useSearchParams` aurait exigé une enveloppe
// `Suspense` et fabriqué un DEUXIÈME lecteur de la même adresse, à côté
// du `window.location.search` que `EmbedPreviewClient` lit déjà pour la
// mesure.

import {
  CLE_PROFIL,
  CLE_SOURCE,
  profilNettoye,
  sourceDeLaGeneration,
  type SourceGeneration,
} from "@/lib/analytics/parcours";
import { OBJECTIVE_KEYS } from "@/components/embed/embed-i18n";

/** Les trois clés du brief. `source` et `profil` sont nommées ailleurs. */
export const CLE_SUJET = "sujet";
export const CLE_AUDIENCE = "audience";
export const CLE_OBJECTIF = "objectif";

/** La borne des deux textes libres, la sienne. Le formulaire, lui, accepte 200. */
export const MAX_TEXTE = 160;

type CleObjectif = (typeof OBJECTIVE_KEYS)[number];

/**
 * LE SLUG DE L'URL, TRADUIT EN CLÉ DU FORMULAIRE.
 *
 * Béné : « Vérifie les deux dernières entrées contre les libellés réels
 * de ta liste déroulante "Ton objectif" et corrige si besoin. »
 *
 * Corrigé, et c'est une correction de CIBLE : sa table pointait vers des
 * LIBELLÉS français ("Qualifier mes prospects"). Le formulaire stocke une
 * CLÉ (`objective: "qualifier"`) et son libellé est traduit par l'écran :
 * viser le libellé aurait donné un champ vide sur `/en/`.
 *
 * | son slug          | notre clé   | pourquoi                        |
 * |-------------------|-------------|---------------------------------|
 * | `qualifier`       | `qualifier` | même mot, même intention        |
 * | `orienter`        | `orienter`  | « aider mon audience à choisir »|
 * | `faire-decouvrir` | `decouvrir` | « me faire découvrir »          |
 * | `capturer`        | `qualifier` | « capturer des leads QUALIFIÉS »|
 *
 * Les huit clés réelles sont acceptées telles quelles EN PLUS de ses
 * quatre slugs : un lien écrit plus tard avec `objectif=diagnostiquer`
 * marche sans qu'on ait à revenir ici.
 */
export const OBJECTIFS_PAR_SLUG: Record<string, CleObjectif> = {
  ...Object.fromEntries(OBJECTIVE_KEYS.map((k) => [k, k])),
  "faire-decouvrir": "decouvrir",
  capturer: "qualifier",
};

export type Prefill = {
  sujet: string;
  audience: string;
  /** Une clé de `OBJECTIVE_KEYS`, ou `null` quand l'URL ne dit rien de lisible. */
  objectif: CleObjectif | null;
  /** Le brief est complet : le formulaire peut partir tout seul. */
  pret: boolean;
  source: SourceGeneration;
  profil: string | null;
};

const nettoie = (v: string | null, max: number) =>
  String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

/**
 * CE QUE L'ADRESSE PORTE, ET RIEN DE PLUS.
 *
 * Une valeur d'URL finit dans un PROMPT, donc elle se borne et elle se
 * valide. Mais elle ne REFUSE jamais : un objectif illisible rend `null`
 * et le formulaire garde son défaut. Un écran qui répondrait « paramètre
 * invalide » à quelqu'un qui vient de cliquer un bouton, c'est quelqu'un
 * qui part (« Un clic rejeté sur Générer fait partir des gens »).
 *
 * `pret` reprend son seuil : plus de deux caractères de chaque côté. Il
 * est plus exigeant que le formulaire (qui accepte 3 et 2), donc un
 * lancement automatique ne peut pas se faire refuser.
 */
export function lirePrefill(recherche: string | null | undefined): Prefill {
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(String(recherche ?? ""));
  } catch {
    return { sujet: "", audience: "", objectif: null, pret: false, source: "direct", profil: null };
  }
  const sujet = nettoie(params.get(CLE_SUJET), MAX_TEXTE);
  const audience = nettoie(params.get(CLE_AUDIENCE), MAX_TEXTE);
  const slug = nettoie(params.get(CLE_OBJECTIF), 40).toLowerCase();
  return {
    sujet,
    audience,
    objectif: OBJECTIFS_PAR_SLUG[slug] ?? null,
    pret: sujet.length > 2 && audience.length > 2,
    source: sourceDeLaGeneration(params.get(CLE_SOURCE)),
    profil: profilNettoye(params.get(CLE_PROFIL)),
  };
}

export type LienGenerateur = {
  sujet: string;
  audience: string;
  objectif: keyof typeof OBJECTIFS_PAR_SLUG;
  /**
   * LA SOURCE EST OBLIGATOIRE SUR UN LIEN, ET C'EST LE DÉNOMINATEUR.
   *
   * `"direct"` veut dire « arrivée sans paramètres » : un lien qui ne la
   * porte pas rend toutes ses générations `"direct"`, donc le ratio
   * `generation_lancee -> compte_cree` ne dit plus d'où viennent les
   * gens. Le compilateur refuse donc un appelant qui se tait.
   */
  source: Exclude<SourceGeneration, "direct">;
  /** Le profil du quiz du hero. Omis quand il n'y en a pas. */
  profil?: string | null;
  absolu?: boolean;
};

/** L'hôte public, le même que partout ailleurs. */
const HOTE = "https://tiquiz.fr";

/**
 * LE LIEN QUE POSE LA LANDING.
 *
 * Un paramètre vide n'est jamais écrit : `?profil=` rangerait une
 * septième catégorie vide à côté des six vrais profils dans GA4.
 */
export function lienGenerateur(a: LienGenerateur): string {
  const p = new URLSearchParams();
  const sujet = nettoie(a.sujet, MAX_TEXTE);
  const audience = nettoie(a.audience, MAX_TEXTE);
  if (sujet) p.set(CLE_SUJET, sujet);
  if (audience) p.set(CLE_AUDIENCE, audience);
  if (a.objectif) p.set(CLE_OBJECTIF, String(a.objectif));
  p.set(CLE_SOURCE, a.source);
  const profil = profilNettoye(a.profil);
  if (profil) p.set(CLE_PROFIL, profil);
  return `${a.absolu ? HOTE : ""}/generateur-de-quiz?${p.toString()}`;
}

/**
 * LE LANCEMENT AUTOMATIQUE NE PART QUE D'UNE NAVIGATION DEPUIS CHEZ NOUS.
 *
 * Béné : « La page est publique, un robot peut lancer autant d'appels IA
 * qu'il veut et la facture est pour nous. »
 *
 * Un robot qui rend le JavaScript et qui suit les six liens de la landing
 * ferait partir six générations PAYANTES, et il gonflerait `generation_lancee`
 * avec des gens qui n'existent pas. Un vrai clic depuis la landing, lui,
 * porte toujours un referrer de chez nous (aucune politique de referrer
 * n'est posée, donc le défaut du navigateur envoie l'adresse complète sur
 * une navigation de même origine).
 *
 * Le sens de l'erreur est sûr : un referrer absent ou étranger (un lien
 * partagé sur un réseau, un lien collé à la main) coûte UN CLIC sur un
 * formulaire déjà rempli et déjà valide. Jamais un écran vide, jamais un
 * refus.
 *
 * Ce que je n'ai PAS mesuré, et qui se dit : le comportement réel d'un
 * robot qui rend le JavaScript sur cette page. C'est un garde contre un
 * risque identifié, pas contre un fait observé.
 */
export function lancementAutomatiqueAutorise(a: {
  referrer: string | null | undefined;
  hote: string | null | undefined;
}): boolean {
  const ref = String(a.referrer ?? "").trim();
  if (!ref) return false;
  let hoteDuReferrer: string;
  try {
    hoteDuReferrer = new URL(ref).host.toLowerCase();
  } catch {
    return false;
  }
  const hote = String(a.hote ?? "").trim().toLowerCase();
  return hoteDuReferrer.length > 0 && hoteDuReferrer === hote;
}
