// components/embed/embed-types.ts
// Types shared between the embed preview React components and the
// /api/embed/quiz/* endpoints. Mirrors the JSON shape Claude produces
// + the database schema in supabase/migrations/023.

export type EmbedQuestion = {
  question_text: string;
  options: { text: string; result_index?: number }[];
  question_type?: string;
  config?: Record<string, unknown>;
};

export type EmbedResult = {
  title: string;
  description?: string;
  insight?: string;
  projection?: string;
  cta_text?: string;
  cta_url?: string;
};

export type EmbedQuiz = {
  title?: string;
  introduction?: string;
  description?: string;
  share_message?: string;
  locale?: string;
  // Branding overrides exposed in the embed editor. They map 1:1
  // to the quizzes table columns of the same name on claim, so
  // the visitor's design choices land in their account untouched.
  brand_font?: string;
  brand_color_primary?: string;
  brand_color_background?: string;
  questions: EmbedQuestion[];
  results: EmbedResult[];
};

/**
 * CE QUE LE VISITEUR RÈGLE, ET C'EST LE MÊME JEU QUE DANS TIQUIZ.
 *
 * Béné, 8 septembre 2026 : "pour obtenir la même qualité de quiz, il
 * faut réutiliser la fonction 'créer un quiz avec l'ia' du vrai tiquiz
 * [...] on doit coller au mieux à l'intérieur de tiquiz en fait."
 *
 * Les champs portent donc les MÊMES noms et les MÊMES valeurs que
 * `components/quiz/QuizFormClient.tsx` : `format`, `quizType`,
 * `resultCount`, `intention`. Un visiteur qui découvre l'outil ici
 * retrouve exactement les mêmes réglages une fois inscrit.
 *
 * `questionCount` a DISPARU, et c'est délibéré : le vrai formulaire le
 * DÉDUIT du format (court -> 4, long -> 8). Deux réglages pour une
 * seule décision, c'est un des deux qui finit par mentir.
 */
export type EmbedInputs = {
  topic: string;
  audience: string;
  objective: string;
  /** "Pourquoi tu crées ce quiz ?" : l'offre vers laquelle il ramène. Facultatif. */
  intention: string;
  tone: string;
  format: "short" | "long";
  /** Par profil (qui es-tu ?) ou avec un score (où en es-tu ?). */
  quizType: "profile" | "scoring";
  /** Nombre de profils, ou de tranches de score. */
  resultCount: number;
  askFirstName: boolean;
  askGender: boolean;
};

export type EmbedPhase = "loading" | "form" | "generating" | "edit";

export type EmbedLocale = "fr" | "en";
