// lib/embed/rattacherQuiz.ts
//
// LE TRANSFERT DE PROPRIÉTÉ, ÉCRIT UNE FOIS.
//
// Le quiz fabriqué sur la page de vente n'est pas un brouillon dans le
// vide : `/api/embed/quiz/generate` crée une VRAIE ligne dans `quizzes`,
// sans propriétaire (`user_id` NULL) et marquée du jeton de session.
// Le rattacher, c'est donc lui poser un propriétaire, pas le recopier.
// L'adresse que la personne éditait dans l'iframe devient l'adresse
// définitive de son quiz.
//
// Ce fichier ne prend AUCUNE décision : elles vivent dans le module pur
// `lib/embed/reprise.ts`. Ici il n'y a que des écritures, parce qu'il
// importe `supabaseAdmin` et qu'aucun test ne peut donc le charger.
//
// **DEUX APPELANTS, UN SEUL TRANSFERT** : l'inscription
// (`/api/auth/signup`, le cas normal depuis le 2 septembre) et la route
// de réclamation (`/api/embed/quiz/claim`, que le tableau de bord
// appelle en filet). Deux endroits qui décideraient chacun de leur côté
// finiraient par se contredire : c'est le défaut sorti six fois dans ce
// dépôt, et ici il coûterait le travail d'une cliente.

import { resolveProjectIdForInsert } from "@/lib/projects/scopeFilter";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type RaisonRattachement =
  | "jeton-illisible"
  | "session-introuvable"
  | "deja-reclamee"
  | "pas-la-bonne-adresse"
  | "aucun-quiz-anonyme"
  | "transfert-impossible";

export type Rattachement =
  | { ok: true; quizId: string }
  | { ok: false; raison: RaisonRattachement };

/**
 * Rend la session si elle est réclamable par cette personne.
 *
 * `emailAttendu` n'est vérifié que si la session en porte un : l'embed
 * ne demande plus d'adresse, et c'est alors la POSSESSION du jeton qui
 * autorise. C'est un UUID qui n'a jamais quitté le navigateur de la
 * personne, et il arrive ici par une navigation qu'elle a déclenchée.
 */
export async function lireSessionReclamable(args: {
  jeton: string;
  emailAttendu?: string | null;
}): Promise<
  | { ok: true; session: { id: string; email: string | null; quiz: unknown } }
  | { ok: false; raison: RaisonRattachement }
> {
  const { data, error } = await supabaseAdmin
    .from("embed_quiz_sessions")
    .select("id, email, quiz, claimed_by_user_id")
    .eq("id", args.jeton)
    .limit(1);

  if (error) {
    console.error("[reprise] lecture de la session impossible :", error.message);
    return { ok: false, raison: "session-introuvable" };
  }
  const session = data?.[0];
  if (!session) return { ok: false, raison: "session-introuvable" };
  if (session.claimed_by_user_id) return { ok: false, raison: "deja-reclamee" };

  const attendu = (args.emailAttendu ?? "").trim().toLowerCase();
  if (attendu && session.email && session.email.toLowerCase() !== attendu) {
    return { ok: false, raison: "pas-la-bonne-adresse" };
  }
  return { ok: true, session: { id: session.id, email: session.email, quiz: session.quiz } };
}

/**
 * Pose le propriétaire sur le quiz anonyme, puis marque la session.
 *
 * **L'ORDRE COMPTE** : on transfère D'ABORD, on marque ENSUITE. Marquer
 * en premier laisserait une session « réclamée » dont le quiz n'a
 * toujours pas de propriétaire, c'est à dire un quiz perdu que plus
 * aucun appel ne pourra rattraper (le filet du tableau de bord refuse
 * une session déjà réclamée). C'est la règle des lots de versement du
 * 25 août, transposée : on crée la pièce avant de la solder.
 */
export async function rattacherQuizAnonyme(args: {
  sessionId: string;
  userId: string;
}): Promise<Rattachement> {
  const { data: anonyme } = await supabaseAdmin
    .from("quizzes")
    .select("id")
    .eq("embed_session_id", args.sessionId)
    .is("user_id", null)
    .maybeSingle();

  if (!anonyme?.id) return { ok: false, raison: "aucun-quiz-anonyme" };

  const projectId = await resolveProjectIdForInsert(args.userId);
  const { error } = await supabaseAdmin
    .from("quizzes")
    .update({ user_id: args.userId, project_id: projectId, embed_session_id: null })
    .eq("id", anonyme.id)
    .is("user_id", null);

  if (error) {
    console.error("[reprise] transfert de propriete impossible :", error.message);
    return { ok: false, raison: "transfert-impossible" };
  }

  await marquerSessionReclamee({ sessionId: args.sessionId, userId: args.userId });
  return { ok: true, quizId: anonyme.id };
}

export async function marquerSessionReclamee(args: {
  sessionId: string;
  userId: string;
}): Promise<void> {
  await supabaseAdmin
    .from("embed_quiz_sessions")
    .update({ claimed_by_user_id: args.userId, claimed_at: new Date().toISOString() })
    .eq("id", args.sessionId);
}
