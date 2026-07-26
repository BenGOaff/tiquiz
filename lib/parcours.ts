// lib/parcours.ts — requêtes serveur du parcours.
import "server-only";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import type {
  Answer,
  Day,
  DayWithProgress,
  Profile,
  Question,
} from "@/lib/types";
import type { ProgressSnapshot } from "@/lib/gamification";

/** Etat de progression condense, pour le calcul des badges. */
export function snapshotFromDays(days: DayWithProgress[]): ProgressSnapshot {
  const parcours = days.filter((d) => !d.is_bonus);
  return {
    completedParcoursDays: parcours
      .filter((d) => d.progress === "completed")
      .map((d) => d.day_number),
    totalParcoursDays: parcours.length,
    completedBonusCount: days.filter((d) => d.is_bonus && d.progress === "completed").length,
  };
}

export interface Viewer {
  userId: string;
  email: string | null;
  profile: Profile | null;
  enrolled: boolean;
}

/**
 * Charge l'utilisateur courant, son profil et son statut d'accès.
 * Renvoie null si pas de session.
 */
export async function getViewer(): Promise<Viewer | null> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: enrollment }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase
      .from("enrollments")
      .select("status")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle(),
  ]);

  return {
    userId: user.id,
    email: user.email ?? null,
    profile: (profile as Profile) ?? null,
    enrolled: Boolean(enrollment),
  };
}

/**
 * Tous les jours publiés, ordonnés, avec l'état de progression de
 * l'élève. Déblocage immédiat (binge) : un jour est débloqué si c'est
 * le premier, ou si le jour précédent est complété.
 */
export async function getDaysWithProgress(userId: string): Promise<DayWithProgress[]> {
  const supabase = await getSupabaseServerClient();

  const [{ data: days }, { data: progress }] = await Promise.all([
    supabase
      .from("days")
      .select("*")
      .eq("status", "published")
      .order("sort_order", { ascending: true }),
    supabase.from("progress").select("day_id, status, completed_at").eq("user_id", userId),
  ]);

  const progressByDay = new Map(
    (progress ?? []).map((p) => [p.day_id as string, p]),
  );

  const result: DayWithProgress[] = [];
  let previousCompleted = true; // le premier jour du parcours est toujours débloqué

  for (const d of (days ?? []) as Day[]) {
    const p = progressByDay.get(d.id);
    const isCompleted = p?.status === "completed";
    // Les bonus sont accessibles a tout moment (hors de la sequence
    // quotidienne) ; les jours du parcours se debloquent en cascade.
    const unlocked = d.is_bonus ? true : previousCompleted;
    const status = isCompleted ? "completed" : unlocked ? "in_progress" : "locked";

    result.push({
      ...d,
      resources: Array.isArray(d.resources) ? d.resources : [],
      progress: status,
      unlocked,
      completed_at: (p?.completed_at as string) ?? null,
    });

    // Seuls les jours du parcours font avancer la cascade de deblocage.
    if (!d.is_bonus) previousCompleted = isCompleted;
  }

  return result;
}

export interface DayDetail {
  day: DayWithProgress;
  questions: Question[];
  answers: Record<string, Answer>;
}

/**
 * Détail d'un jour (par numéro) : contenu + questions + réponses déjà
 * données par l'élève. Renvoie null si le jour n'existe pas, n'est pas
 * publié, ou n'est pas encore débloqué.
 */
export async function getDayDetail(
  userId: string,
  dayNumber: number,
  opts?: { bypassLock?: boolean },
): Promise<DayDetail | null> {
  const all = await getDaysWithProgress(userId);
  const day = all.find((d) => d.day_number === dayNumber);
  if (!day) return null;
  // Un admin peut previsualiser n'importe quel jour publie, meme verrouille.
  if (!day.unlocked && !opts?.bypassLock) return null;

  const supabase = await getSupabaseServerClient();
  const [{ data: questions }, { data: answers }] = await Promise.all([
    supabase
      .from("questions")
      .select("*")
      .eq("day_id", day.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("answers")
      .select("question_id, value_text, value_choice")
      .eq("user_id", userId)
      .eq("day_id", day.id),
  ]);

  const answerMap: Record<string, Answer> = {};
  for (const a of (answers ?? []) as Answer[]) {
    answerMap[a.question_id] = a;
  }

  return {
    day,
    questions: ((questions ?? []) as Question[]).map((q) => ({
      ...q,
      options: Array.isArray(q.options) ? q.options : [],
      multi: Boolean((q as { multi?: boolean }).multi),
    })),
    answers: answerMap,
  };
}
