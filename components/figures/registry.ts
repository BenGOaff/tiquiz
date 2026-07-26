// components/figures/registry.ts
// Schemas reutilisables, inserables dans le contenu des jours via un
// shortcode [[figure:cle]]. Pour en ajouter un : une entree ici + un cas
// dans Figure.tsx.

export interface FigureOption {
  key: string;
  label: string;
}

export const FIGURE_OPTIONS: FigureOption[] = [
  { key: "boucle-apprendre", label: "La boucle apprendre en faisant (J0)" },
  { key: "quiz-maths", label: "Maths du quiz, 2% contre 30% (J1)" },
  { key: "profil-vs-score", label: "Quiz de profil contre quiz de score (J1)" },
  { key: "trame-resultat", label: "La trame d'un résultat qui vend (J1)" },
  { key: "cle-api-pont", label: "La clé API, pont Tiquiz - Systeme.io (J2)" },
  { key: "chaine-resultat", label: "Chaîne résultat, tag, segment, offre (J2)" },
  { key: "deux-moteurs-viraux", label: "Les 2 moteurs viraux, finir et partager (J3)" },
  { key: "v1-imparfaite", label: "Publier une v1 imparfaite plutôt que rien (J4)" },
  { key: "page-resultat", label: "Page de résultat en 4 temps (J4, bonus vendre)" },
  { key: "boucle-viralite", label: "La boucle d'auto-viralité (J5)" },
  { key: "echelle-confiance", label: "L'échelle de confiance, lead à achat (J6)" },
  { key: "funnel-5-etapes", label: "Le funnel en 5 étapes (J7)" },
  { key: "offre-auto-liquidante", label: "L'offre auto-liquidante (bonus trafic payant)" },
  { key: "quiz-vs-sondage", label: "Quiz contre sondage (bonus sondages)" },
  { key: "capture-pic", label: "Capture au pic de curiosité (bonus popquiz)" },
  { key: "regle-7-contacts", label: "La règle des 7 contacts (bonus réseaux)" },
];

export const FIGURE_KEYS = FIGURE_OPTIONS.map((f) => f.key);
