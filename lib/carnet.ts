// lib/carnet.ts — agrege les reponses de l'eleve en "carnet de bord".
// Server-only. Le carnet, c'est le projet de l'eleve qui prend forme :
// pour chaque jour, les questions auxquelles il a repondu et sa reponse
// (texte libre, ou libelle de l'option choisie).
import "server-only";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getDaysWithProgress } from "@/lib/parcours";
import type { Answer, Day, Question, QuestionOption, QuestionType } from "@/lib/types";

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
  // Multi-select : plusieurs valeurs jointes par des virgules -> on remappe
  // chaque valeur vers son libellé et on rejoint (fallback sur la valeur brute
  // si un ancien slug n'existe plus dans les options).
  if (question.multi || choice.includes(",")) {
    return choice
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean)
      .map((v) => question.options.find((o) => o.value === v)?.label ?? v)
      .join(", ");
  }
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

// ── Le carnet comme "chantier vivant" : le livrable de l'eleve qui prend
//    forme, regroupe en sections lisibles de son futur quiz/funnel. ──

/** Une reponse editable du chantier (source = SES reponses uniquement). */
export interface SynthItem {
  questionId: string;
  dayNumber: number;
  prompt: string;
  helpText: string | null;
  type: QuestionType;
  options: QuestionOption[];
  multi: boolean;
  required: boolean;
  valueText: string;
  valueChoice: string;
  /** Reponse affichable (texte libre, ou libelles des options choisies). */
  display: string;
  answered: boolean;
}

/** Un pan du livrable (ex. "Ta transformation", "Ton quiz en ligne"). */
export interface SynthSection {
  key: string;
  title: string;
  blurb: string;
  items: SynthItem[];
  filled: number;
  total: number;
}

export interface CarnetSynthesis {
  sections: SynthSection[];
  /** Reponses aux bonus explores (affichees seulement si remplies). */
  bonus: SynthItem[];
  /** Questions cles remplies / total (base du pourcentage). */
  filledKey: number;
  totalKey: number;
  percent: number;
  /** Au moins une reponse quelque part (parcours ou bonus). */
  hasAnything: boolean;
}

// Le mapping section -> jours. On derive l'appartenance des questions des
// jours REELS presents en base : une section n'apparait que si un de ses
// jours existe ET est debloque pour l'eleve. Robuste aux re-seeds.
const SECTION_CONFIG: { key: string; title: string; blurb: string; days: number[] }[] = [
  {
    key: "depart",
    title: "Ton point de départ",
    blurb: "Ta niche et ton engagement de publier. La base de tout le reste.",
    days: [0],
  },
  {
    key: "transformation",
    title: "Ta transformation et tes profils de résultats",
    blurb: "L'angle de ton quiz, tes 3 ou 4 résultats, les mots exacts de ta cible.",
    days: [1],
  },
  {
    key: "tuyauterie",
    title: "Ta tuyauterie Systeme.io",
    blurb: "Le tuyau qui accueille et range tes leads tout seuls, avec le bon message.",
    days: [2],
  },
  {
    key: "viral",
    title: "Ton quiz pensé pour être partagé",
    blurb: "Ton titre, ton format, le résultat dont tes clients seraient fiers.",
    days: [3],
  },
  {
    key: "enligne",
    title: "Ton quiz en ligne",
    blurb: "Généré, connecté à Systeme.io, publié. Ton actif devient réel.",
    days: [4],
  },
  {
    key: "diffusion",
    title: "Ta diffusion",
    blurb: "Où tu vas chercher du monde, gratuitement, et ton premier post.",
    days: [5],
  },
  {
    key: "communaute",
    title: "Ta communauté",
    blurb: "L'endroit à toi où tes leads reviennent et te font confiance.",
    days: [6],
  },
  {
    key: "pilotage",
    title: "Ton pilotage et ta suite",
    blurb: "Ton point de fuite, ton correctif, et ton plan des 30 prochains jours.",
    days: [7],
  },
];

function toSynthItem(
  q: Question,
  dayNumber: number,
  answer: Answer | undefined,
): SynthItem {
  const valueText = (answer?.value_text ?? "").trim();
  const valueChoice = (answer?.value_choice ?? "").trim();
  const display = answer ? displayAnswer(q, answer) : "";
  return {
    questionId: q.id,
    dayNumber,
    prompt: q.prompt,
    helpText: q.help_text ?? null,
    type: q.type,
    options: Array.isArray(q.options) ? q.options : [],
    multi: Boolean(q.multi),
    required: Boolean(q.required),
    valueText,
    valueChoice,
    display,
    answered: display.trim() !== "",
  };
}

/**
 * Le carnet vu comme le livrable en construction. On ne fabrique JAMAIS de
 * contenu : on organise et on met en valeur les reponses de l'eleve. Le
 * pourcentage se calcule sur toutes les questions CLES (required) du parcours
 * publie (bonus exclus), qu'elles soient debloquees ou non : honnete sur ce
 * qu'il reste a ecrire de son quiz.
 */
export async function getCarnetSynthesis(userId: string): Promise<CarnetSynthesis> {
  const supabase = await getSupabaseServerClient();

  const [{ data: questions }, { data: answers }, daysProgress] = await Promise.all([
    supabase
      .from("questions")
      .select("id, day_id, prompt, help_text, type, options, multi, required, sort_order")
      .order("sort_order", { ascending: true }),
    supabase
      .from("answers")
      .select("question_id, value_text, value_choice")
      .eq("user_id", userId),
    getDaysWithProgress(userId),
  ]);

  const answerByQuestion = new Map<string, Answer>();
  for (const a of (answers ?? []) as Answer[]) answerByQuestion.set(a.question_id, a);

  const questionsByDayId = new Map<string, Question[]>();
  for (const raw of (questions ?? []) as Question[]) {
    const q: Question = {
      ...raw,
      options: Array.isArray(raw.options) ? raw.options : [],
      multi: Boolean((raw as { multi?: boolean }).multi),
    };
    const list = questionsByDayId.get(q.day_id) ?? [];
    list.push(q);
    questionsByDayId.set(q.day_id, list);
  }

  // Index des jours par numero (id, is_bonus, unlocked) depuis la progression.
  const dayByNumber = new Map<
    number,
    { id: string; isBonus: boolean; unlocked: boolean }
  >();
  for (const d of daysProgress) {
    dayByNumber.set(d.day_number, {
      id: d.id,
      isBonus: d.is_bonus,
      unlocked: d.unlocked,
    });
  }

  // Denominateur du pourcentage : toutes les questions cles (required) des
  // jours du parcours (bonus exclus), debloquees ou non.
  let filledKey = 0;
  let totalKey = 0;
  for (const [num, meta] of dayByNumber) {
    if (meta.isBonus) continue;
    const qs = questionsByDayId.get(meta.id) ?? [];
    for (const q of qs) {
      if (!q.required) continue;
      totalKey += 1;
      const item = toSynthItem(q, num, answerByQuestion.get(q.id));
      if (item.answered) filledKey += 1;
    }
  }

  // Sections : uniquement les jours presents ET debloques (on ne teasе pas un
  // jour verrouille). Chaque section liste ses questions, remplies ou non.
  const sections: SynthSection[] = [];
  for (const cfg of SECTION_CONFIG) {
    const items: SynthItem[] = [];
    for (const num of cfg.days) {
      const meta = dayByNumber.get(num);
      if (!meta || meta.isBonus || !meta.unlocked) continue;
      const qs = questionsByDayId.get(meta.id) ?? [];
      for (const q of qs) items.push(toSynthItem(q, num, answerByQuestion.get(q.id)));
    }
    if (items.length === 0) continue;
    sections.push({
      key: cfg.key,
      title: cfg.title,
      blurb: cfg.blurb,
      items,
      filled: items.filter((i) => i.answered).length,
      total: items.length,
    });
  }

  // Bonus : reponses effectivement donnees uniquement (pas de tease).
  const bonus: SynthItem[] = [];
  for (const [num, meta] of dayByNumber) {
    if (!meta.isBonus) continue;
    const qs = questionsByDayId.get(meta.id) ?? [];
    for (const q of qs) {
      const item = toSynthItem(q, num, answerByQuestion.get(q.id));
      if (item.answered) bonus.push(item);
    }
  }
  bonus.sort((a, b) => a.dayNumber - b.dayNumber);

  const percent = totalKey > 0 ? Math.round((filledKey / totalKey) * 100) : 0;
  const hasAnything =
    bonus.length > 0 || sections.some((s) => s.items.some((i) => i.answered));

  return { sections, bonus, filledKey, totalKey, percent, hasAnything };
}
