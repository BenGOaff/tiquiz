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

export type EmbedInputs = {
  topic: string;
  audience: string;
  objective: string;
  questionCount: number;
  tone: string;
  askFirstName: boolean;
  askGender: boolean;
};

export type EmbedPhase = "loading" | "form" | "generating" | "edit";

export type EmbedLocale = "fr" | "en";
