// lib/templates/types.ts
//
// Types des templates de quiz par métier (phase 5 ROADMAP_RETENTION.md).
//
// Un template est une DONNÉE STATIQUE versionnée (pas en DB) qui calque
// EXACTEMENT la shape du payload accepté par POST /api/quiz. Pour
// instancier un template, le client POST ce `payload` tel quel → réutilise
// le persisteur de quiz existant, zéro divergence, zéro risque sur les
// quiz existants.
//
// Le mapping option → result : chaque option porte un `result_index`
// (0..n) qui pointe sur `results[result_index]`. Le résultat majoritaire
// gagne (scoring par vote majoritaire, comportement Tiquiz standard).

export interface TemplateQuestionOption {
  text: string;
  result_index: number;
  // Points portes par l'option (mode scoring, ou poids de profil). Optionnel.
  points?: number;
}

export interface TemplateQuestion {
  question_text: string;
  options: TemplateQuestionOption[];
  // Type de question (defaut "multiple_choice"). Les types echelle/etoiles/
  // texte libre n'ont pas d'options ; yes_no en a 2 (Oui/Non).
  question_type?: string;
  // Config par type (min/max/labels pour l'echelle, max pour les etoiles,
  // maxLength pour le texte libre, multi_select/optional pour les choix).
  config?: Record<string, unknown>;
}

export interface TemplateResult {
  title: string;
  description: string;
  insight: string;
  projection: string;
  cta_text: string;
}

/**
 * Payload calqué sur la sortie de génération IA (cf. /api/quiz POST).
 * Ce qui n'est pas ici (locale, ask_first_name, etc.) prend les
 * défauts du persisteur — on garde volontairement minimal.
 */
export interface TemplatePayload {
  title: string;
  introduction: string;
  cta_text: string;
  share_message: string;
  virality_enabled: boolean;
  address_form: "tu" | "vous";
  questions: TemplateQuestion[];
  results: TemplateResult[];
}

export interface QuizTemplate {
  /** Identifiant stable (URL /templates/<slug>). Ne jamais renommer. */
  slug: string;
  /** Métier ciblé, pour le filtre de la galerie. */
  metier: string;
  emoji: string;
  /** Titre court affiché sur la carte de la galerie. */
  cardTitle: string;
  /** Accroche d'une ligne sous le titre. */
  tagline: string;
  /** Pour qui c'est, en clair (SEO + preview). */
  whoFor: string;
  /** Pourquoi ça marche comme lead magnet (1-2 phrases, preview). */
  whyItWorks: string;
  /** Durée de passation estimée côté visiteur. */
  estimatedMinutes: number;
  payload: TemplatePayload;
}
