// lib/quiz/chargeViewer.ts
//
// RECOMPOSER LA CHARGE D'UN QUIZ, UNE FOIS, POUR LES DEUX PORTES.
//
// Le viewer attend un seul objet : la ligne du quiz, plus ses questions
// et ses resultats a plat. Or cette recomposition existait en DEUX
// exemplaires depuis que la page publique livre la charge avec le HTML
// (9 septembre 2026) : une fois dans le client, sur la reponse de l'API
// (`{ ...json.quiz, questions, results }`), une fois dans la page. Deux
// recompositions finissent toujours par ne plus donner le meme objet, et
// ici l'ecart se verrait sur un ecran de visiteur, pas dans un test.
//
// CE MODULE EST PUR, ET C'EST LA RAISON D'ETRE DE SA SEPARATION.
// `lib/quiz/chargerQuizPublic.ts` importe `supabaseAdmin`, qui LEVE au
// chargement quand les variables d'environnement manquent : aucun test
// ne peut le charger. Une regle enfermee dedans ne serait donc pas
// testee, et c'est exactement la ou les bugs s'installent (regle du
// 1er aout).

/** Les trois morceaux tels qu'ils arrivent, de la base ou de l'API. */
export type MorceauxDuQuiz = {
  quiz: Record<string, unknown> | null | undefined;
  questions: unknown[] | null | undefined;
  results: unknown[] | null | undefined;
};

/**
 * La charge que le viewer attend.
 *
 * Les deux replis en tableau vide ne sont pas decoratifs : un quiz sans
 * question est un quiz qu'une creatrice vient de creer, et le viewer doit
 * l'afficher (son ecran d'accueil) au lieu de planter sur un `.map` d'un
 * `undefined`.
 */
export function chargeDuViewer(m: MorceauxDuQuiz): Record<string, unknown> {
  return {
    ...(m.quiz ?? {}),
    questions: m.questions ?? [],
    results: m.results ?? [],
  };
}
