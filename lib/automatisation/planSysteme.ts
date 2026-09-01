// lib/automatisation/planSysteme.ts
//
// « CE QU'IL FAUT CRÉER DANS SYSTEME.IO POUR CE QUIZ »
// (Béné, 1er septembre 2026).
//
// "Un onglet Automatisation qui explique le workflow et les tags précis à
// créer dans Systeme.io. Pas un truc générique, un truc réel qui explique
// selon le bonus offert, le CTA, les profils de résultats."
//
// -- POURQUOI CET ÉCRAN EXISTE, ET CE QU'IL RÉPARE ---------------------
//
// Tiquiz POSE des tags sur le contact Systeme.io. Mais **poser un tag ne
// déclenche rien** : il faut une règle d'automatisation, créée à la main
// dans le tableau de bord, qui écoute ce tag. On l'a mesuré le 31 août,
// et c'est le trou le plus coûteux du produit : une créatrice met son
// quiz en ligne, capte 40 adresses, et il ne se passe rien. Elle n'en
// conclut pas qu'il lui manque une règle. Elle en conclut que Tiquiz ne
// sert à rien.
//
// -- LA RÈGLE : ON N'ANNONCE QUE CE QUI PART VRAIMENT ------------------
//
// C'est tout l'enjeu du "pas un truc générique". Les six familles de tags
// n'ont PAS les mêmes conditions, et une liste qui les récite toutes
// enverrait la créatrice construire des workflows sur des tags qui ne
// seront jamais posés :
//
//   - les tags de PROFIL ne partent que sur un QUIZ (un sondage n'a pas
//     de résultat) ;
//   - `sio_capture_tag` ne part QUE sur un SONDAGE ;
//   - les tags par RÉPONSE ne partent que sur un sondage ;
//   - les tags de SCORE n'existent que si `sio_score_tags` est coché ET
//     que le quiz a des points ;
//   - le tag de PARTAGE ne part que si le visiteur partage pour de vrai ;
//   - une formation ou une communauté Systeme.io est ouverte PAR TIQUIZ
//     directement : il ne faut SURTOUT pas créer un workflow de plus,
//     sinon l'accès s'ouvre deux fois.
//
// -- PURE, ET SANS UNE SEULE PHRASE -----------------------------------
//
// L'interface existe en 7 langues. Ce module rend des DONNÉES (le nom
// exact du tag, le type d'étape, le contexte), l'écran écrit les
// phrases. C'est la même règle que partout ailleurs : le serveur dit ce
// qui se passe, l'interface dit comment le dire.

import {
  axisSlug,
  normalizeScoringAxes,
  resolveScoreLabels,
  slugifyAxisLabel,
  type ScoreLabels,
} from "@/lib/quizScoring";

/** Ce que la créatrice devra choisir comme ACTION dans Systeme.io. */
export type ActionSysteme =
  /** S'abonner à une campagne d'emails. */
  | "campagne"
  /** Envoyer un email unique (le bonus, par exemple). */
  | "email"
  /** Rien à créer : Tiquiz le fait déjà. */
  | "rien";

/** La famille d'une étape. L'écran en tire son titre et son explication. */
export type TypeEtape =
  | "profil"
  | "capture-sondage"
  | "reponse-sondage"
  | "score"
  | "partage"
  | "acces-automatique";

export interface EtapeAutomatisation {
  /** Clé stable pour React et pour les tests. */
  cle: string;
  type: TypeEtape;
  /** Le nom EXACT du tag, tel que Tiquiz le posera. */
  tag: string;
  /**
   * Le nom de workflow proposé. C'est le tag, tel quel : deux noms
   * différents pour la même chose obligent à faire la correspondance de
   * tête à chaque fois qu'on relit sa liste de workflows.
   */
  nomWorkflow: string;
  action: ActionSysteme;
  /** Ce que ce tag désigne : le titre du profil, le libellé de l'axe... */
  contexte?: string;
  /**
   * Vrai quand le tag n'est pas un nom fixe mais un MOTIF : les tags de
   * score sont calculés au moment de la réponse. L'écran doit alors
   * montrer la liste des valeurs possibles, pas promettre un nom unique.
   */
  motif?: boolean;
  /** Les noms réellement possibles, pour un motif. */
  valeurs?: string[];
}

/** Ce qui empêche une étape de fonctionner, ou tout le quiz. */
export type TypeManque =
  /** Aucune clé Systeme.io reliée : AUCUN tag ne part, sur rien. */
  | "cle-api"
  /** Un profil sans tag : ses répondants ne sont étiquetés nulle part. */
  | "tag-profil"
  /** Le partage est proposé mais aucun tag ne le marque. */
  | "tag-partage"
  /** Un sondage sans tag de capture. */
  | "tag-capture";

export interface ManqueAutomatisation {
  type: TypeManque;
  /** Le profil concerné, quand il y en a un. */
  contexte?: string;
  /** Bloquant = rien ne part du tout tant que ce n'est pas réglé. */
  bloquant: boolean;
}

export interface PlanAutomatisation {
  etapes: EtapeAutomatisation[];
  manques: ManqueAutomatisation[];
}

/** Le quiz, réduit à ce dont le plan a besoin. */
export interface QuizPourPlan {
  mode?: string | null;
  locale?: string | null;
  sio_api_key_id?: string | null;
  sio_capture_tag?: string | null;
  sio_share_tag_name?: string | null;
  sio_score_tags?: boolean | null;
  scoring_axes?: unknown;
  score_labels?: unknown;
  show_result_share?: boolean | null;
  virality_enabled?: boolean | null;
}

export interface ResultatPourPlan {
  title?: string | null;
  sio_tag_name?: string | null;
  sio_tag_names?: string[] | null;
  sio_course_id?: string | null;
  sio_community_id?: string | null;
}

export interface QuestionPourPlan {
  options?: Array<{ sio_tag_name?: string | null; text?: string | null } | null> | null;
}

function propre(v: unknown): string {
  return String(v ?? "").trim();
}

/** Les tags d'un profil, l'ancien champ unique servant de repli. */
export function tagsDuProfil(r: ResultatPourPlan): string[] {
  const multiples = Array.isArray(r.sio_tag_names)
    ? r.sio_tag_names.map(propre).filter(Boolean)
    : [];
  if (multiples.length > 0) return multiples;
  const seul = propre(r.sio_tag_name);
  return seul ? [seul] : [];
}

/**
 * Les noms de tags de score que ce quiz peut poser.
 *
 * Ils sont CALCULÉS au moment de la réponse (`score-eleve`,
 * `sommeil-bas`...), donc on ne peut pas en promettre un seul. On rend
 * la liste complète des valeurs possibles, ce qui est exactement ce
 * qu'il faut pour créer les règles à l'avance.
 */
export function tagsDeScorePossibles(quiz: QuizPourPlan): {
  global: string[];
  parAxe: { axe: string; valeurs: string[] }[];
} {
  const labels: ScoreLabels = resolveScoreLabels(quiz.score_labels, quiz.locale);
  const tranches = [labels.low, labels.mid, labels.high].map(
    (l, i) => slugifyAxisLabel(l) || ["low", "mid", "high"][i],
  );
  const global = tranches.map((t) => `score-${t}`);
  const parAxe = normalizeScoringAxes(quiz.scoring_axes).map((axe) => ({
    axe: propre((axe as { label?: string }).label) || axisSlug(axe),
    valeurs: tranches.map((t) => `${axisSlug(axe)}-${t}`),
  }));
  return { global, parAxe };
}

/**
 * Le plan complet pour UN quiz.
 *
 * PURE. Ne rend que des étapes dont le tag part VRAIMENT, et signale à
 * part ce qui manque pour que ça parte.
 */
export function construirePlanAutomatisation(
  quiz: QuizPourPlan,
  resultats: ResultatPourPlan[],
  questions: QuestionPourPlan[] = [],
): PlanAutomatisation {
  const etapes: EtapeAutomatisation[] = [];
  const manques: ManqueAutomatisation[] = [];
  const estSondage = propre(quiz.mode) === "survey";

  // BLOQUANT EN PREMIER. Sans clé, aucun contact n'est créé et aucun tag
  // n'est posé : tout le reste de l'écran serait un plan pour rien.
  if (!propre(quiz.sio_api_key_id)) {
    manques.push({ type: "cle-api", bloquant: true });
  }

  if (estSondage) {
    const capture = propre(quiz.sio_capture_tag);
    if (capture) {
      etapes.push({
        cle: "capture",
        type: "capture-sondage",
        tag: capture,
        nomWorkflow: capture,
        action: "campagne",
      });
    } else {
      manques.push({ type: "tag-capture", bloquant: false });
    }

    // Les tags par RÉPONSE. Une seule étape par tag distinct : la même
    // règle sert toutes les questions qui portent ce tag, et en créer
    // une par question ferait partir la campagne plusieurs fois.
    const vus = new Set<string>();
    questions.forEach((q) => {
      (q.options ?? []).forEach((o) => {
        const tag = propre(o?.sio_tag_name);
        if (!tag || vus.has(tag.toLowerCase())) return;
        vus.add(tag.toLowerCase());
        etapes.push({
          cle: `reponse-${tag}`,
          type: "reponse-sondage",
          tag,
          nomWorkflow: tag,
          action: "campagne",
          contexte: propre(o?.text) || undefined,
        });
      });
    });
  } else {
    // UN QUIZ : ce sont les profils qui étiquettent, jamais le tag de
    // capture (il n'est appliqué que sur les sondages).
    resultats.forEach((r, i) => {
      const titre = propre(r.title);
      const tags = tagsDuProfil(r);
      if (tags.length === 0) {
        manques.push({ type: "tag-profil", contexte: titre || undefined, bloquant: false });
        return;
      }
      tags.forEach((tag, j) => {
        etapes.push({
          cle: `profil-${i}-${j}`,
          type: "profil",
          tag,
          nomWorkflow: tag,
          action: "campagne",
          contexte: titre || undefined,
        });
      });
      // Formation ou communauté : TIQUIZ ouvre l'accès lui même. Une
      // règle de plus ouvrirait l'accès deux fois, et c'est le genre de
      // doublon qu'on ne voit qu'en recevant deux emails.
      if (propre(r.sio_course_id) || propre(r.sio_community_id)) {
        etapes.push({
          cle: `acces-${i}`,
          type: "acces-automatique",
          tag: tags[0],
          nomWorkflow: tags[0],
          action: "rien",
          contexte: titre || undefined,
        });
      }
    });
  }

  // LES TAGS DE SCORE, seulement s'ils sont cochés.
  if (quiz.sio_score_tags === true) {
    const { global, parAxe } = tagsDeScorePossibles(quiz);
    etapes.push({
      cle: "score-global",
      type: "score",
      tag: global[0] ?? "",
      nomWorkflow: global[0] ?? "",
      action: "campagne",
      motif: true,
      valeurs: global,
    });
    parAxe.forEach((a, i) => {
      etapes.push({
        cle: `score-axe-${i}`,
        type: "score",
        tag: a.valeurs[0] ?? "",
        nomWorkflow: a.valeurs[0] ?? "",
        action: "campagne",
        contexte: a.axe,
        motif: true,
        valeurs: a.valeurs,
      });
    });
  }

  // LE BONUS DE PARTAGE. Un seul workflow, quel que soit le nombre de
  // profils : le tag est posé au niveau du quiz.
  //
  // MESURÉ dans la route de partage, pas déduit : le tag part dès qu'il
  // est RENSEIGNÉ, sans regarder `virality_enabled`. On annonce donc
  // l'étape dans ce cas là, et pas seulement quand le bonus de partage
  // est activé.
  const tagPartage = propre(quiz.sio_share_tag_name);
  if (tagPartage) {
    etapes.push({
      cle: "partage",
      type: "partage",
      tag: tagPartage,
      nomWorkflow: tagPartage,
      action: "email",
    });
  } else if (quiz.virality_enabled === true) {
    // On ne réclame le tag QUE si un bonus de partage est réellement
    // promis. Les simples boutons de partage de la page de résultat
    // (`show_result_share`, vrai par défaut) ne promettent rien : crier
    // là dessus ferait rougir l'écran de presque tout le monde, et un
    // avertissement qui sort pour rien finit ignoré.
    manques.push({ type: "tag-partage", bloquant: false });
  }

  return { etapes, manques };
}
