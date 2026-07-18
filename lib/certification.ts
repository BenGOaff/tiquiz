// lib/certification.ts — examen de certification de fin de formation.
//
// L'examen est volontairement HORS de la table `questions` (qui interdit
// le QCM trivia et n'a pas de notion de bonne reponse). Ici, on VEUT un
// quiz qui valide les competences : les bonnes reponses vivent donc
// cote serveur uniquement (jamais envoyees au navigateur via RLS), et le
// score est calcule par le serveur. L'eleve ne peut pas tricher.
//
// Contenu user-visible : tutoiement, accents respectes, zero tiret long.
import "server-only";

export const CERT_BRAND = "L'Atelier du Quiz";
export const CERT_TITLE = "Certificat de fin de formation";
/** Part de bonnes reponses pour valider (ni trop simple, ni trop dur). */
export const CERT_PASS_RATIO = 0.8;

export interface ExamOption {
  value: string;
  label: string;
}

interface ExamQuestionFull {
  id: string;
  prompt: string;
  help?: string;
  options: ExamOption[];
  /** value de la bonne option (jamais envoyee au client). */
  correct: string;
}

/** Question telle que vue par l'eleve (sans la bonne reponse). */
export interface PublicExamQuestion {
  id: string;
  prompt: string;
  help?: string;
  options: ExamOption[];
}

// 10 questions couvrant les 7 jours du parcours (au moins une par jour).
// Une seule bonne reponse par question. Positions des bonnes reponses
// volontairement variees.
const EXAM: ExamQuestionFull[] = [
  {
    id: "q1",
    prompt: "Pourquoi un quiz capte beaucoup mieux les leads qu'un PDF gratuit ?",
    options: [
      { value: "a", label: "Parce qu'il est plus joli à regarder." },
      { value: "b", label: "Parce qu'il convertit 20 à 50% des visiteurs, contre 1 à 3% pour une page de capture classique." },
      { value: "c", label: "Parce qu'il évite d'avoir une liste email." },
      { value: "d", label: "Parce qu'il coûte plus cher à produire." },
    ],
    correct: "b",
  },
  {
    id: "q2",
    prompt: "Dans la méthode inversée, par quoi commence-t-on ?",
    options: [
      { value: "a", label: "Par définir ses 3 ou 4 résultats (profils) AVANT d'écrire les questions." },
      { value: "b", label: "Par écrire toutes les questions d'abord." },
      { value: "c", label: "Par choisir les couleurs du quiz." },
      { value: "d", label: "Par lancer la publicité." },
    ],
    correct: "a",
  },
  {
    id: "q3",
    prompt: "Quelle est la différence entre un quiz de profil et un quiz de score ?",
    options: [
      { value: "a", label: "Il n'y en a aucune." },
      { value: "b", label: "Le score sert à noter les bonnes réponses, le profil non." },
      { value: "c", label: "Le profil range dans un type (partage, portée), le score situe sur un niveau (montre un manque, donne envie d'acheter)." },
      { value: "d", label: "Le profil est interdit en B2B." },
    ],
    correct: "c",
  },
  {
    id: "q4",
    prompt: "Quel est le bon chemin d'automatisation après le quiz ?",
    options: [
      { value: "a", label: "Email, puis résultat, puis tag." },
      { value: "b", label: "Tag, puis vente, puis email." },
      { value: "c", label: "Aucune automatisation, on fait tout à la main." },
      { value: "d", label: "Résultat du quiz, puis tag, puis groupe de gens, puis le bon email." },
    ],
    correct: "d",
  },
  {
    id: "q5",
    prompt: "Quels sont les 2 moteurs qui rendent un quiz viral ?",
    options: [
      { value: "a", label: "Le prix et la publicité." },
      { value: "b", label: "On le finit jusqu'au bout, et on partage son résultat." },
      { value: "c", label: "La couleur et la police." },
      { value: "d", label: "Le PDF et la newsletter." },
    ],
    correct: "b",
  },
  {
    id: "q6",
    prompt: "Où placer la capture de l'email pour maximiser tes leads ?",
    options: [
      { value: "a", label: "Juste avant d'afficher le résultat." },
      { value: "b", label: "Tout au début, avant la première question." },
      { value: "c", label: "Après avoir montré le résultat complet." },
      { value: "d", label: "Jamais, on ne capture pas d'email." },
    ],
    correct: "a",
  },
  {
    id: "q7",
    prompt: "Quelle est la trame d'une page de fin qui vend (sans forcer) ?",
    options: [
      { value: "a", label: "Juste le prix de l'offre." },
      { value: "b", label: "Une simple note sur 10." },
      { value: "c", label: "Le souci, la cause, la solution (ce qu'un profil doit faire), puis le pont vers l'offre." },
      { value: "d", label: "Un lien vers un PDF à télécharger." },
    ],
    correct: "c",
  },
  {
    id: "q8",
    prompt: "Que dit la règle des 7 contacts ?",
    options: [
      { value: "a", label: "Il faut créer 7 quiz différents." },
      { value: "b", label: "On doit te voir environ 7 fois avant d'agir, d'où l'importance de la régularité." },
      { value: "c", label: "Il faut poster 7 fois par jour." },
      { value: "d", label: "Il faut être présent sur 7 réseaux minimum." },
    ],
    correct: "b",
  },
  {
    id: "q9",
    prompt: "Comment choisir la maison de ta communauté (Facebook, Telegram, WhatsApp, Skool) ?",
    options: [
      { value: "a", label: "Prendre la plus à la mode du moment." },
      { value: "b", label: "Les ouvrir toutes en même temps." },
      { value: "c", label: "Celle où ton audience est déjà et que tu peux animer dans la durée, une seule pour commencer." },
      { value: "d", label: "Celle qui propose le plus d'emojis." },
    ],
    correct: "c",
  },
  {
    id: "q10",
    prompt: "Une fois ton quiz en ligne, comment l'améliores-tu ?",
    options: [
      { value: "a", label: "Au feeling, sans rien regarder." },
      { value: "b", label: "En pilotant avec tes vrais chiffres (vues, complétion, leads)." },
      { value: "c", label: "En le supprimant pour repartir de zéro." },
      { value: "d", label: "En attendant un an sans y toucher." },
    ],
    correct: "b",
  },
];

export const EXAM_TOTAL = EXAM.length;
/** Nombre de bonnes reponses requises pour valider. */
export const EXAM_PASS_MARK = Math.ceil(EXAM_TOTAL * CERT_PASS_RATIO);

/** Questions a envoyer au navigateur (sans les bonnes reponses). */
export function getPublicExam(): PublicExamQuestion[] {
  return EXAM.map(({ id, prompt, help, options }) => ({ id, prompt, help, options }));
}

export interface ExamResult {
  score: number;
  total: number;
  passed: boolean;
}

/** Corrige l'examen cote serveur. `answers` = { questionId: optionValue }. */
export function scoreExam(answers: Record<string, string>): ExamResult {
  let score = 0;
  for (const q of EXAM) {
    if (answers?.[q.id] === q.correct) score += 1;
  }
  return { score, total: EXAM_TOTAL, passed: score >= EXAM_PASS_MARK };
}
