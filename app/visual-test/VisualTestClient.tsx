"use client";

// Harness de tests visuels : quiz de demo EN DUR (aucune base, aucun fetch)
// rendu par le vrai PublicQuizClient. Les query params pilotent la
// disposition pour couvrir la matrice des rendus dans tests/visual.
import PublicQuizClient, { type PublicQuizData } from "@/components/quiz/PublicQuizClient";
import { resolveQuizBranding, type QuizBranding } from "@/lib/quizBranding";

const DEMO_QUIZ = {
  id: "00000000-0000-4000-8000-000000000001",
  title: "Quel createur de quiz es-tu ?",
  introduction:
    "<p>Deux minutes pour decouvrir ton profil et repartir avec un plan concret. Ce quiz de demonstration sert aux tests visuels.</p>",
  start_button_text: "Commencer le quiz",
  locale: "fr",
  address_form: "tu",
  mode: "quiz",
  status: "active",
  capture_enabled: true,
  capture_heading: "Ton profil est pret !",
  capture_subtitle: "Laisse ton email pour le decouvrir.",
  capture_submit_text: "Voir mon profil",
  capture_first_name: true,
  first_name_required: false,
  show_consent_checkbox: true,
  virality_enabled: false,
  ask_first_name: false,
  ask_gender: false,
  cta_text: "Aller plus loin",
  cta_url: "https://example.com",
  questions: [
    {
      id: "q1",
      question_text: "Quand tu lances un projet, tu commences par quoi ?",
      question_type: "multiple_choice",
      sort_order: 0,
      options: [
        { text: "Un plan detaille", result_index: 0, points: 2 },
        { text: "Un premier test rapide", result_index: 1, points: 2 },
        { text: "Demander des avis autour de toi", result_index: 0, points: 1 },
      ],
    },
    {
      id: "q2",
      question_text: "Ta relation aux outils en ligne ?",
      question_type: "multiple_choice",
      sort_order: 1,
      options: [
        { text: "J'adore essayer les nouveautes", result_index: 1, points: 2 },
        { text: "Je garde ce qui marche", result_index: 0, points: 2 },
      ],
    },
  ],
  results: [
    {
      id: "r1",
      title: "L'architecte",
      description: "<p>Tu construis des bases solides avant d'ouvrir les portes.</p>",
      insight: "Ta force : rien n'est laisse au hasard.",
      projection: "Et si tu passais a l'action des cette semaine ?",
      cta_text: "Decouvrir la methode",
      cta_url: "https://example.com",
      sort_order: 0,
    },
    {
      id: "r2",
      title: "L'exploratrice",
      description: "<p>Tu testes vite, tu apprends vite, tu ajustes vite.</p>",
      insight: "Ta force : l'elan.",
      projection: "Et si tu structurais ce qui marche deja ?",
      cta_text: "Passer au niveau suivant",
      cta_url: "https://example.com",
      sort_order: 1,
    },
  ],
} as unknown as PublicQuizData;

// Motif SVG inline : image de fond stable et hors reseau pour le mode bg=image.
const BG_IMAGE_DATA_URI =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900"><rect width="1600" height="900" fill="%235D6CDB"/><circle cx="400" cy="300" r="260" fill="%23ffffff" opacity="0.25"/><circle cx="1200" cy="650" r="340" fill="%23000000" opacity="0.18"/></svg>',
  );

export default function VisualTestClient({
  layout,
  intro,
  bg,
}: {
  layout: string;
  intro: string;
  bg: string;
}) {
  const base = resolveQuizBranding(null, null);
  const branding: QuizBranding = {
    ...base,
    questionLayout: layout === "split" ? "split" : layout === "left" ? "left" : "centered",
    introLayout: intro === "cover" ? "cover" : "card",
    backgroundStyle: bg === "gradient" ? "gradient" : bg === "image" ? "image" : "solid",
    backgroundGradient: bg === "gradient" ? ("lavande" as QuizBranding["backgroundGradient"]) : null,
    backgroundImageUrl: bg === "image" ? BG_IMAGE_DATA_URI : null,
  };
  const quiz: PublicQuizData = {
    ...DEMO_QUIZ,
    ...(intro === "cover" ? { intro_image_url: BG_IMAGE_DATA_URI, intro_layout: "cover" } : {}),
  } as PublicQuizData;
  return <PublicQuizClient quizId={String(quiz.id)} previewData={quiz} previewBranding={branding} />;
}
