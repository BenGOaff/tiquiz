// lib/carnet.ts — agrege les reponses de l'eleve en "carnet de bord".
// Server-only. Le carnet, c'est le projet de l'eleve qui prend forme :
// pour chaque jour, les questions auxquelles il a repondu et sa reponse
// (texte libre, ou libelle de l'option choisie).
import "server-only";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import type { Answer, Day, Question } from "@/lib/types";

export interface CarnetEntry {
  questionId: string;
  prompt: string;
  answer: string;
}

export interface CarnetDay {
  dayNumber: number;
  title: string;
  isBonus: boolean;
  entries: CarnetEntry[];
}

/** Reponse affichable : texte libre, ou libelle de l'option choisie. */
function displayAnswer(question: Question, answer: Answer): string {
  if (question.type === "action") {
    return (answer.value_text ?? "").trim();
  }
  const choice = (answer.value_choice ?? "").trim();
  if (!choice) return (answer.value_text ?? "").trim();
  const opt = question.options.find((o) => o.value === choice);
  return opt?.label ?? choice;
}

export async function getCarnet(userId: string): Promise<CarnetDay[]> {
  const supabase = await getSupabaseServerClient();

  const [{ data: days }, { data: questions }, { data: answers }] = await Promise.all([
    supabase
      .from("days")
      .select("id, day_number, title, is_bonus, sort_order")
      .eq("status", "published")
      .order("sort_order", { ascending: true }),
    supabase
      .from("questions")
      .select("id, day_id, prompt, type, options, sort_order")
      .order("sort_order", { ascending: true }),
    supabase
      .from("answers")
      .select("question_id, day_id, value_text, value_choice")
      .eq("user_id", userId),
  ]);

  const answerByQuestion = new Map<string, Answer>();
  for (const a of (answers ?? []) as Answer[]) {
    answerByQuestion.set(a.question_id, a);
  }

  const questionsByDay = new Map<string, Question[]>();
  for (const q of (questions ?? []) as Question[]) {
    const list = questionsByDay.get(q.day_id) ?? [];
    list.push({ ...q, options: Array.isArray(q.options) ? q.options : [] });
    questionsByDay.set(q.day_id, list);
  }

  const result: CarnetDay[] = [];
  for (const d of (days ?? []) as Pick<Day, "id" | "day_number" | "title" | "is_bonus">[]) {
    const dayQuestions = questionsByDay.get(d.id) ?? [];
    const entries: CarnetEntry[] = [];
    for (const q of dayQuestions) {
      const a = answerByQuestion.get(q.id);
      if (!a) continue;
      const answer = displayAnswer(q, a);
      if (!answer) continue;
      entries.push({ questionId: q.id, prompt: q.prompt, answer });
    }
    // On n'affiche que les jours ou l'eleve a effectivement repondu.
    if (entries.length > 0) {
      result.push({
        dayNumber: d.day_number,
        title: d.title,
        isBonus: d.is_bonus,
        entries,
      });
    }
  }

  return result;
}
