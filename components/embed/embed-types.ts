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

export type EmbedPhase = "loading" | "form" | "generating" | "edit" | "publishing";

export type EmbedLocale = "fr" | "en";
