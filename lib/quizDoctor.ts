// lib/quizDoctor.ts
// Chantier C : audit du quiz Tiquiz de l'eleve (avant/apres publication).
// Logique pure (reutilisable serveur + client). On lit la structure du
// quiz (compteurs + reglages, via l'endpoint partenaire Tiquiz) et on sort
// une checklist de corrections concretes, chacune reliee a un jour.

/** Un profil de resultat LIVE du quiz (titre + description + CTA). Sert au
 *  generateur d'emails par profil (source de verite = le vrai quiz). */
export interface QuizResultProfile {
  title: string;
  description: string;
  /** CTA du resultat : destination reelle de l'user (promo, formation, rdv...). */
  ctaText?: string;
  ctaUrl?: string;
}

export interface QuizStruct {
  title: string;
  status: string;
  questions: number;
  results: number;
  resultsWithImage: number;
  captureEnabled: boolean;
  askFirstName: boolean;
  viralityEnabled: boolean;
  hasBonus: boolean;
  hasOgImage: boolean;
  views: number;
  // Champs enrichis (optionnels : l'audit pur n'en depend pas).
  id?: string;
  mode?: string;
  resultProfiles?: QuizResultProfile[];
}

export interface QuizIssue {
  severity: "alerte" | "conseil";
  title: string;
  fix: string;
  dayNumber?: number;
}

export interface QuizAudit {
  title: string;
  status: string;
  issues: QuizIssue[];
}

export function auditQuiz(q: QuizStruct): QuizIssue[] {
  const issues: QuizIssue[] = [];

  // Capture : sans elle, zero lead. Le point le plus critique.
  if (!q.captureEnabled) {
    issues.push({
      severity: "alerte",
      title: "La capture email est désactivée.",
      fix: "Active la capture, sinon ton quiz ne récolte aucun lead. Et place-la juste avant le résultat.",
      dayNumber: 4,
    });
  }

  // Questions : ni zero, ni trop, ni trop peu.
  if (q.questions === 0) {
    issues.push({
      severity: "alerte",
      title: "Ton quiz n'a aucune question.",
      fix: "Ajoute 4 à 8 questions identitaires (jamais l'email en premier).",
      dayNumber: 4,
    });
  } else if (q.questions > 10) {
    issues.push({
      severity: "conseil",
      title: `Beaucoup de questions (${q.questions}).`,
      fix: "Au-delà de 8, tu perds des gens en route. Raccourcis à l'essentiel.",
      dayNumber: 4,
    });
  } else if (q.questions < 3) {
    issues.push({
      severity: "conseil",
      title: `Très peu de questions (${q.questions}).`,
      fix: "Vise 4 à 8 questions pour un diagnostic crédible et personnalisé.",
      dayNumber: 4,
    });
  }

  // Resultats : la segmentation.
  if (q.results <= 1) {
    issues.push({
      severity: "alerte",
      title: q.results === 0 ? "Aucun profil de résultat." : "Un seul profil de résultat.",
      fix: "Crée 3 ou 4 profils valorisants : c'est ce qui segmente tes leads et personnalise tes emails.",
      dayNumber: 1,
    });
  } else if (q.results === 2) {
    issues.push({
      severity: "conseil",
      title: "Seulement 2 résultats.",
      fix: "3 ou 4 profils segmentent mieux ton audience et donnent un email par bucket.",
      dayNumber: 1,
    });
  }

  // Images : OG (apercu au partage) + image par resultat (viralite).
  if (!q.hasOgImage) {
    issues.push({
      severity: "conseil",
      title: "Pas d'image de partage (aperçu OG).",
      fix: "Ajoute une image OG : tes liens partagés seront bien plus cliqués.",
      dayNumber: 4,
    });
  }
  if (q.results > 0 && q.resultsWithImage < q.results) {
    issues.push({
      severity: "conseil",
      title: "Des résultats n'ont pas d'image partageable.",
      fix: "Donne une image à chaque résultat : on partage ce qui se voit et qui valorise.",
      dayNumber: 5,
    });
  }

  // Personnalisation.
  if (!q.askFirstName) {
    issues.push({
      severity: "conseil",
      title: "Personnalisation par prénom désactivée.",
      fix: "Active-la : un quiz qui appelle par le prénom se termine davantage.",
      dayNumber: 4,
    });
  }

  // Viralite + coherence du bonus.
  if (!q.viralityEnabled) {
    issues.push({
      severity: "conseil",
      title: "Le bonus de partage est désactivé.",
      fix: "Active-le : c'est ta croissance gratuite (l'anti-triche honnête, partage pour débloquer).",
      dayNumber: 5,
    });
  } else if (!q.hasBonus) {
    issues.push({
      severity: "conseil",
      title: "Partage activé, mais aucun bonus défini.",
      fix: "Ajoute un bonus désirable à débloquer au partage, sinon l'incitation tombe à plat.",
      dayNumber: 5,
    });
  }

  return issues;
}
