// lib/survey/analysis.ts (Tiquiz)
//
// Agrégation des réponses d'un sondage + génération de l'analyse IA.
// Port adapté de Tipote. Tiquiz n'a pas de helper callClaude partagé →
// on appelle l'API Anthropic en direct (même endpoint que la génération
// de quiz), sur le tier opus (claude-opus-4-8) car l'analyse = CONTENU
// (Béné : meilleur Claude dispo).

import { resolveAnthropicModel } from "@/lib/anthropicModel";
import { buildClaudeMessageBody } from "@/lib/claudeRequest";
import { sanitizeAiText } from "@/lib/aiTextSanitizer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { stripHtml } from "@/lib/richText";
import { localizedYesNo, isAnswered } from "@/lib/survey/format";

export const SURVEY_AI_MIN_RESPONSES = 5;

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";

function getClaudeApiKey(): string {
  return (
    process.env.ANTHROPIC_API_KEY?.trim() ||
    process.env.CLAUDE_API_KEY_OWNER?.trim() ||
    ""
  );
}

function getAnalysisModel(): string {
  return resolveAnthropicModel(process.env.TIQUIZ_SURVEY_AI_MODEL || process.env.ANTHROPIC_MODEL, "opus");
}

export interface SurveyAnswerRaw {
  question_index?: number;
  option_index?: number;
  option_indices?: number[];
  rating?: number;
  stars?: number;
  text?: string;
}

export interface AggregatedOption {
  text: string;
  count: number;
  pct: number;
}

export interface AggregatedQuestion {
  index: number;
  text: string;
  type: string;
  options: AggregatedOption[];
  textSamples?: string[];
  /** Nombre TOTAL de réponses libres (les textSamples n'en sont qu'un échantillon). */
  textCount?: number;
  average?: number | null;
  /** Nombre de répondants ayant RÉELLEMENT répondu à cette question. */
  answeredCount: number;
}

export interface SurveyAggregate {
  totalResponses: number;
  questions: AggregatedQuestion[];
}

export interface SurveyAnalysisResult {
  summary: string;
  takeaways: string[];
  actions: string[];
  responses_at_generation: number;
  model: string;
  generated_at: string;
}

interface QuestionRow {
  question_text: string | null;
  options: Array<{ text?: string }> | null;
  sort_order: number;
  question_type: string | null;
}

/**
 * Agrège toutes les réponses d'un sondage. `userId` scope la sécurité
 * (le quiz doit appartenir au user). Retourne null sinon.
 */
export async function aggregateSurvey(
  quizId: string,
  userId: string,
): Promise<SurveyAggregate | null> {
  const { data: quiz } = await supabaseAdmin
    .from("quizzes")
    .select("id, user_id, mode, locale")
    .eq("id", quizId)
    .maybeSingle();
  if (!quiz || quiz.user_id !== userId) return null;
  const locale = (quiz as { locale?: string | null }).locale ?? "fr";

  const { data: questionsRaw } = await supabaseAdmin
    .from("quiz_questions")
    .select("question_text, options, sort_order, question_type")
    .eq("quiz_id", quizId)
    .order("sort_order", { ascending: true });
  const questions = (questionsRaw ?? []) as QuestionRow[];

  const { data: leads } = await supabaseAdmin
    .from("quiz_leads")
    .select("answers")
    .eq("quiz_id", quizId);

  const totals: Record<number, Record<number, number>> = {};
  const ratingSums: Record<number, { sum: number; n: number }> = {};
  const textSamples: Record<number, string[]> = {};
  const textCounts: Record<number, number> = {};
  // Combien de répondants ont RÉELLEMENT répondu à chaque question. Indispensable
  // pour que l'IA ne déduise pas "personne n'a répondu" (drame 26 juin 2026 :
  // une question yes_no à 100% comptée comme vide car ses options ne sont pas
  // stockées en base).
  const answeredPerQ: Record<number, number> = {};
  let totalResponses = 0;

  for (const lead of leads ?? []) {
    const answers = (lead as { answers?: SurveyAnswerRaw[] | null }).answers;
    if (!Array.isArray(answers)) continue;
    totalResponses += 1;
    for (const ans of answers) {
      const qi = typeof ans.question_index === "number" ? ans.question_index : null;
      if (qi === null) continue;
      if (!isAnswered(ans)) continue;
      answeredPerQ[qi] = (answeredPerQ[qi] ?? 0) + 1;
      if (Array.isArray(ans.option_indices)) {
        if (!totals[qi]) totals[qi] = {};
        for (const oi of ans.option_indices) {
          if (typeof oi === "number") totals[qi][oi] = (totals[qi][oi] ?? 0) + 1;
        }
      } else if (typeof ans.option_index === "number") {
        if (!totals[qi]) totals[qi] = {};
        totals[qi][ans.option_index] = (totals[qi][ans.option_index] ?? 0) + 1;
      }
      const ratingVal =
        typeof ans.rating === "number"
          ? ans.rating
          : typeof ans.stars === "number"
            ? ans.stars
            : null;
      if (ratingVal !== null) {
        if (!ratingSums[qi]) ratingSums[qi] = { sum: 0, n: 0 };
        ratingSums[qi].sum += ratingVal;
        ratingSums[qi].n += 1;
      }
      if (typeof ans.text === "string" && ans.text.trim()) {
        textCounts[qi] = (textCounts[qi] ?? 0) + 1;
        if (!textSamples[qi]) textSamples[qi] = [];
        if (textSamples[qi].length < 40) textSamples[qi].push(ans.text.trim());
      }
    }
  }

  const yesNo = localizedYesNo(locale);

  const aggregatedQuestions: AggregatedQuestion[] = questions.map((q, idx) => {
    // question_index = position 0-based dans l'ordre sort_order. On aligne sur
    // l'index du tableau (cohérent avec PublicQuizClient + SurveyTrends).
    const qi = idx;
    const type = String(q.question_type ?? "multiple_choice");
    const counts = totals[qi] ?? {};
    const answeredCount = answeredPerQ[qi] ?? 0;
    // Dénominateur = répondants à CETTE question, pour que les % d'une question
    // à choix unique somment à 100% même si certains l'ont sautée.
    const denom = answeredCount > 0 ? answeredCount : 1;
    const pct = (count: number) => Math.round((count / denom) * 1000) / 10;

    let options: AggregatedOption[];
    if (type === "yes_no") {
      // Les questions yes_no ne portent PAS d'options en base : on synthétise
      // Oui/Non depuis la locale + les compteurs option_index 0/1.
      options = [
        { text: yesNo.yes, count: counts[0] ?? 0, pct: pct(counts[0] ?? 0) },
        { text: yesNo.no, count: counts[1] ?? 0, pct: pct(counts[1] ?? 0) },
      ];
    } else if (type === "rating_scale" || type === "star_rating" || type === "free_text") {
      // Pas de distribution par option : la moyenne / les exemples portent
      // l'information (gérés plus bas).
      options = [];
    } else {
      const optionTexts = Array.isArray(q.options) ? q.options : [];
      options = optionTexts.map((opt, oi) => {
        const count = counts[oi] ?? 0;
        return {
          text: stripHtml(String(opt?.text ?? `Option ${oi + 1}`)).trim() || `Option ${oi + 1}`,
          count,
          pct: pct(count),
        };
      });
    }

    const rating = ratingSums[qi];
    return {
      index: qi,
      text: stripHtml(String(q.question_text ?? `Question ${qi + 1}`)).trim() || `Question ${qi + 1}`,
      type,
      options,
      textSamples: textSamples[qi],
      textCount: textCounts[qi] ?? 0,
      average: rating && rating.n > 0 ? Math.round((rating.sum / rating.n) * 100) / 100 : null,
      answeredCount,
    };
  });

  return { totalResponses, questions: aggregatedQuestions };
}

/**
 * Appelle Claude (Opus) pour produire l'analyse structurée. Appel direct
 * à l'API Anthropic (non-streaming) ; on lit le texte complet puis on
 * parse le JSON.
 */
export async function generateSurveyAnalysis(
  aggregate: SurveyAggregate,
  surveyTitle: string,
): Promise<SurveyAnalysisResult> {
  const apiKey = getClaudeApiKey();
  if (!apiKey) throw new Error("Claude API key missing");
  const model = getAnalysisModel();

  const system = [
    "Tu es un analyste qui aide un créateur à exploiter les résultats d'un sondage.",
    "Tu réponds en français, ton direct et concret, tutoiement.",
    "Tu ne fais JAMAIS de remplissage : chaque phrase doit être actionnable ou révélatrice.",
    "Tu te bases UNIQUEMENT sur les chiffres fournis, sans inventer de données.",
    "RÈGLE CLÉ sur le comptage :",
    "- Chaque question affiche '[N/T ont répondu]' : N = personnes ayant répondu à CETTE question, T = total des participants. Si N > 0, la question A des réponses : ne dis JAMAIS qu'elle est vide ou sans données.",
    "- Pour une question à réponses libres, le nombre total est donné explicitement ('N réponses libres'). Les exemples cités ne sont qu'un ÉCHANTILLON : n'en déduis pas que seules ces réponses existent, ni que les autres participants n'ont pas répondu.",
    "- Les pourcentages d'une question sont calculés sur les répondants à cette question (pas sur le total), ils somment donc à 100% pour un choix unique.",
    "Tu réponds STRICTEMENT en JSON valide, sans texte autour, au format :",
    '{ "summary": string, "takeaways": string[], "actions": string[] }',
    "- summary : 2-4 phrases sur ce que disent VRAIMENT les résultats.",
    "- takeaways : 3 à 5 enseignements concrets (puces courtes).",
    "- actions : 3 à 5 actions concrètes à mettre en place, à l'impératif.",
  ].join("\n");

  const lines: string[] = [`Sondage : "${surveyTitle}"`, `Nombre de participants : ${aggregate.totalResponses}`, ""];
  for (const q of aggregate.questions) {
    lines.push(`Q${q.index + 1}. ${q.text}  [${q.answeredCount}/${aggregate.totalResponses} ont répondu]`);
    for (const o of q.options) lines.push(`   - ${o.text} : ${o.pct}% (${o.count})`);
    if (q.average !== null && q.average !== undefined) lines.push(`   (note moyenne : ${q.average})`);
    if (q.textCount && q.textCount > 0) {
      const samples = (q.textSamples ?? []).slice(0, 15).map((s) => `"${s}"`).join(", ");
      lines.push(`   ${q.textCount} réponses libres au total. Échantillon : ${samples}`);
    }
    lines.push("");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  let res: Response;
  try {
    res = await fetch(CLAUDE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      signal: controller.signal,
      // buildClaudeMessageBody retire temperature pour Opus 4.7+ (sinon
      // 400 "temperature is deprecated for this model"). L'analyse de
      // sondage tape sur le tier opus → c'est obligatoire ici.
      body: JSON.stringify(
        buildClaudeMessageBody({
          model,
          max_tokens: 1500,
          temperature: 0.4,
          system,
          messages: [{ role: "user", content: lines.join("\n") }],
        }),
      ),
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Anthropic ${res.status}: ${errText.slice(0, 200)}`);
  }

  const json = (await res.json()) as { content?: Array<{ text?: string }> };
  const raw = (json.content ?? []).map((c) => c.text ?? "").join("").trim();

  const parsed = parseAnalysisJson(raw);
  return {
    summary: parsed.summary,
    takeaways: parsed.takeaways,
    actions: parsed.actions,
    responses_at_generation: aggregate.totalResponses,
    model,
    generated_at: new Date().toISOString(),
  };
}

function parseAnalysisJson(raw: string): {
  summary: string;
  takeaways: string[];
  actions: string[];
} {
  let jsonStr = raw.trim();
  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) jsonStr = fenceMatch[1].trim();
  if (!jsonStr.startsWith("{")) {
    const start = jsonStr.indexOf("{");
    const end = jsonStr.lastIndexOf("}");
    if (start >= 0 && end > start) jsonStr = jsonStr.slice(start, end + 1);
  }
  try {
    const obj = JSON.parse(jsonStr) as Record<string, unknown>;
    const toStringArray = (v: unknown): string[] =>
      Array.isArray(v) ? v.map((x) => sanitizeAiText(String(x).trim())).filter(Boolean) : [];
    return {
      summary: typeof obj.summary === "string" ? sanitizeAiText(obj.summary.trim()) : "",
      takeaways: toStringArray(obj.takeaways),
      actions: toStringArray(obj.actions),
    };
  } catch {
    return { summary: sanitizeAiText(raw.trim().slice(0, 1000)), takeaways: [], actions: [] };
  }
}
