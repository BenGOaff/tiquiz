// lib/quiz/fullFunnel.ts
//
// Le parcours ENTIER d'un visiteur, de son arrivée jusqu'à son email.
//
// -- POURQUOI (audit du quiz de Jocelyne, 4 août 2026) -----------------
//
// Elle a passé trois semaines à réparer une question qui n'avait rien.
// Ses vrais chiffres, une fois sortis :
//
//     142 arrivent  ->  ~66 commencent  ->  55 terminent  ->  55 laissent
//                                                              leur email
//
// Elle perdait donc environ la MOITIÉ de ses visiteurs avant même la
// première question, et huit fois moins sur l'ensemble de ses huit
// questions. Or la carte "funnel par question" commence à la question 1,
// et s'arrête à la dernière. **On lui montrait 14% de son problème**, et
// c'est dans ces 14% qu'elle a cherché.
//
// Ce n'est pas un défaut de calcul, c'est un défaut de cadrage : on avait
// les deux marches manquantes en base depuis toujours (les événements
// `view`, `start` et `complete`, et le compte de leads), on ne les
// mettait simplement pas dans la même image que les questions.
//
// -- CE QUE CE MODULE DÉCIDE ------------------------------------------
//
// Il assemble les trois sources en UNE liste d'étapes comparables, pour
// que la plus grosse fuite se voie, où qu'elle soit. Les seuils de
// lecture restent ceux de `funnelSignal.ts` : ce n'est pas parce qu'on
// élargit le cadre qu'on a le droit de conclure sur trois personnes.

import {
  MIN_LOST,
  MIN_SAMPLE,
  MIN_DROP_PCT,
  type FunnelStepLike,
} from "@/lib/quiz/funnelSignal";

export type FullFunnelStage =
  /** Ils ont ouvert le quiz. */
  | "arrival"
  /** Ils ont cliqué sur le bouton de départ. */
  | "start"
  /** Une question du quiz. */
  | "question"
  /** Ils ont laissé leur email. */
  | "capture";

export type FullFunnelStep = {
  stage: FullFunnelStage;
  /** Position de la question, seulement pour `stage === "question"`. */
  questionIndex: number | null;
  /** Personnes arrivées jusque là. */
  people: number;
  /** Perte vers l'étape suivante, en personnes. null sur la dernière. */
  lost: number | null;
  lostPct: number | null;
  /** true quand la perte mérite d'être regardée (mêmes seuils que le
   *  funnel par question : jamais de verdict sur une poignée de gens). */
  notable: boolean;
};

export type FullFunnelInput = {
  /** Vues trackées. Peut être 0 sur un quiz antérieur au tracking. */
  views: number;
  /** Démarrages. Peut être 0 pour la même raison. */
  starts: number;
  /** Étapes par question, déjà recalées sur les questions vivantes. */
  questions: readonly FunnelStepLike[];
  /** Leads captés. */
  leads: number;
  /** false quand les vues sont incomplètes : on n'affiche alors pas la
   *  marche d'arrivée plutôt que d'inventer une fuite. */
  viewsReliable: boolean;
};

/**
 * Assemble le parcours complet.
 *
 * Règles de prudence, dans l'ordre :
 * - une marche dont on n'a pas la donnée est ABSENTE, jamais à zéro
 *   (même règle que `hasData` sur les questions) ;
 * - une marche qui REMONTE (plus de gens qu'à l'étape d'avant) est
 *   gardée telle quelle, sans perte : ça arrive quand deux compteurs
 *   n'ont pas la même histoire, et l'inventer serait pire ;
 * - `notable` reprend les seuils de `funnelSignal.ts`.
 */
export function buildFullFunnel(input: FullFunnelInput): FullFunnelStep[] {
  const steps: Omit<FullFunnelStep, "lost" | "lostPct" | "notable">[] = [];

  if (input.viewsReliable && input.views > 0) {
    steps.push({ stage: "arrival", questionIndex: null, people: input.views });
  }
  // Le démarrage n'est affiché que s'il apporte quelque chose : sans vues
  // fiables, "X ont commencé" tout seul n'a pas de dénominateur.
  if (input.starts > 0) {
    steps.push({ stage: "start", questionIndex: null, people: input.starts });
  }
  for (const q of input.questions) {
    if (q.hasData === false) continue;
    steps.push({ stage: "question", questionIndex: q.questionIndex, people: q.views });
  }
  if (input.leads > 0) {
    steps.push({ stage: "capture", questionIndex: null, people: input.leads });
  }

  return steps.map((s, i) => {
    const next = steps[i + 1];
    if (!next) {
      return { ...s, lost: null, lostPct: null, notable: false };
    }
    const lost = s.people - next.people;
    if (lost <= 0 || s.people <= 0) {
      return { ...s, lost: 0, lostPct: 0, notable: false };
    }
    const lostPct = Math.round((lost / s.people) * 1000) / 10;
    return {
      ...s,
      lost,
      lostPct,
      notable: s.people >= MIN_SAMPLE && lost >= MIN_LOST && lostPct >= MIN_DROP_PCT,
    };
  });
}

/**
 * La marche qui perd le plus de MONDE, en valeur absolue.
 *
 * En valeur absolue, et pas en pourcentage : c'est toute la leçon du cas
 * Jocelyne. En pourcentage, une étape de fin de parcours où il ne reste
 * que six personnes peut afficher 17% et passer devant un écran d'accueil
 * qui perd la moitié de 142 visiteurs. Le pourcentage dit l'intensité, le
 * nombre de personnes dit l'enjeu, et c'est l'enjeu qui décide de ce
 * qu'on va corriger en premier.
 */
export function biggestLeak(steps: readonly FullFunnelStep[]): FullFunnelStep | null {
  let best: FullFunnelStep | null = null;
  for (const s of steps) {
    if (!s.notable || s.lost === null) continue;
    if (!best || s.lost > (best.lost ?? 0)) best = s;
  }
  return best;
}
