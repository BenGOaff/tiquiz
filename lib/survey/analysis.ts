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
import { buildQuestionPositions, resolveQuestionPosition } from "@/lib/quiz/questionIdentity";
import { fetchAllRows } from "@/lib/db/fetchAllRows";
import { EVIDENCE_RULES } from "@/lib/prompts/evidence";
import { PRIORITY_RULES, capSecondary } from "@/lib/prompts/priority";
import { fetchAnthropic } from "@/lib/aiRetry";
import {
  ANSWER_READING_RULES,
  estMultiSelect,
  renderQuestionsForPrompt,
  resoudreEchelle,
  type EchelleRendue,
} from "@/lib/survey/renderQuestions";
import { cleAnthropic } from "@/lib/ai/cleAnthropic";

export const SURVEY_AI_MIN_RESPONSES = 5;

/** Réponses libres gardées en mémoire par question, avant échantillonnage. */
const MAX_TEXTES_GARDES = 200;

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";



function getAnalysisModel(): string {
  return resolveAnthropicModel(process.env.TIQUIZ_SURVEY_AI_MODEL || process.env.ANTHROPIC_MODEL, "opus");
}

export interface SurveyAnswerRaw {
  question_index?: number;
  /** Identité stable de la question (cf. lib/quiz/questionIdentity.ts). */
  question_id?: string | null;
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
  /** Bornes et libellés d'une échelle. Une moyenne sans son échelle ne
   *  veut rien dire (cf. lib/survey/renderQuestions.ts). */
  echelle?: EchelleRendue | null;
  /** Répartition des notes, valeur par valeur : une moyenne seule cache
   *  une audience coupée en deux. */
  notes?: { valeur: number; count: number }[] | null;
  /** `config.multi_select` : les % se cumulent au delà de 100. */
  multiSelect?: boolean;
  /** Nombre de répondants ayant RÉELLEMENT répondu à cette question. */
  answeredCount: number;
}

export interface SurveyAggregate {
  totalResponses: number;
  questions: AggregatedQuestion[];
}

export interface SurveyAnalysisResult {
  summary: string;
  /** LA chose a faire maintenant, une seule (cf. lib/prompts/priority.ts).
   *  Cet ecran alignait 3 a 5 enseignements PLUS 3 a 5 actions, sans dire
   *  par quoi commencer : c'est le tri qu'on demandait a la creatrice de
   *  faire a notre place. */
  priority: { title: string; why: string; how: string } | null;
  takeaways: string[];
  actions: string[];
  responses_at_generation: number;
  model: string;
  generated_at: string;
}

interface QuestionRow {
  id: string;
  question_text: string | null;
  options: Array<{ text?: string }> | null;
  sort_order: number;
  question_type: string | null;
  /** JSONB par type : bornes d'une échelle, libellés, multi_select. */
  config: Record<string, unknown> | null;
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
    .select("id, question_text, options, sort_order, question_type, config")
    .eq("quiz_id", quizId)
    // Tri secondaire sur `id` : miroir EXACT du row_number() des RPC SQL,
    // pour que la position calculée ici soit la même partout en cas
    // d'égalité de sort_order sur d'anciennes lignes.
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });
  const questions = (questionsRaw ?? []) as QuestionRow[];
  // Identité stable : `question_id` -> position ACTUELLE. Sans ça, l'IA
  // analysait les réponses de Q6 sous le libellé de Q5 dès qu'une question
  // avait été supprimée au milieu (drame Adeline, 1er août 2026).
  const positions = buildQuestionPositions(questions);
  const questionCount = questions.length;

  // Analyse COMPLÈTE (pas de plafond 1000) : pagination serveur, sinon
  // l'IA analyse un échantillon tronqué et fausse ses conclusions.
  const leads = await fetchAllRows<{ answers?: SurveyAnswerRaw[] | null }>((from, to) =>
    supabaseAdmin
      .from("quiz_leads")
      .select("answers")
      .eq("quiz_id", quizId)
      .order("created_at", { ascending: true })
      .range(from, to),
  );

  const totals: Record<number, Record<number, number>> = {};
  const ratingSums: Record<number, { sum: number; n: number }> = {};
  // Répartition note par note. La moyenne seule ne distingue pas une
  // audience tiède d'une audience coupée en deux (26 août 2026).
  const ratingCounts: Record<number, Record<number, number>> = {};
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
      const qi = resolveQuestionPosition(ans, positions, questionCount);
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
        if (!ratingCounts[qi]) ratingCounts[qi] = {};
        ratingCounts[qi][ratingVal] = (ratingCounts[qi][ratingVal] ?? 0) + 1;
      }
      if (typeof ans.text === "string" && ans.text.trim()) {
        textCounts[qi] = (textCounts[qi] ?? 0) + 1;
        if (!textSamples[qi]) textSamples[qi] = [];
        // On garde large et on échantillonne AU RENDU, réparti sur toute
        // la période : garder les 40 premiers ne montrait que l'audience
        // du jour du lancement.
        if (textSamples[qi].length < MAX_TEXTES_GARDES) textSamples[qi].push(ans.text.trim());
      }
    }
  }

  const yesNo = localizedYesNo(locale);

  const aggregatedQuestions: AggregatedQuestion[] = questions.map((q, idx) => {
    // Les compteurs ci-dessus sont déjà rangés par POSITION ACTUELLE
    // (resolveQuestionPosition), donc l'index du tableau suffit ici.
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
    const echelle = resoudreEchelle(type, q.config);
    const compteurs = ratingCounts[qi] ?? {};
    const notes = echelle
      ? (() => {
          const liste: { valeur: number; count: number }[] = [];
          // On parcourt l'ÉCHELLE, pas les valeurs reçues : une note que
          // PERSONNE n'a donnée est une information (c'est le creux qui
          // révèle une audience coupée en deux), et une valeur absente du
          // tableau serait indistinguable d'une valeur hors échelle.
          for (let v = echelle.min; v <= echelle.max; v++) {
            liste.push({ valeur: v, count: compteurs[v] ?? 0 });
          }
          return liste;
        })()
      : null;
    return {
      index: qi,
      text: stripHtml(String(q.question_text ?? `Question ${qi + 1}`)).trim() || `Question ${qi + 1}`,
      type,
      options,
      textSamples: textSamples[qi],
      textCount: textCounts[qi] ?? 0,
      average: rating && rating.n > 0 ? Math.round((rating.sum / rating.n) * 100) / 100 : null,
      echelle,
      notes,
      multiSelect: estMultiSelect(q.config),
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
  const apiKey = cleAnthropic();
  if (!apiKey) throw new Error("Claude API key missing");
  const model = getAnalysisModel();

  const system = [
    "Tu es un analyste qui aide un créateur à exploiter les résultats d'un sondage.",
    "Tu réponds en français, ton direct et concret, tutoiement.",
    "Tu ne fais JAMAIS de remplissage : chaque phrase doit être actionnable ou révélatrice.",
    EVIDENCE_RULES,
    ANSWER_READING_RULES,
    PRIORITY_RULES,
    "Tu réponds STRICTEMENT en JSON valide, sans texte autour, au format :",
    '{ "summary": string, "priority": { "title": string, "why": string, "how": string }, "takeaways": string[], "actions": string[] }',
    "- summary : 2-4 phrases sur ce que disent VRAIMENT les résultats. Commence par ce qui MARCHE quand quelque chose marche.",
    "- priority.title : LA seule chose à faire maintenant, en une phrase à l'impératif.",
    "- priority.why : 1 à 2 phrases, avec SES chiffres à elle, pour qu'elle voie l'enjeu.",
    "- priority.how : 2 à 4 phrases très concrètes sur la manière de s'y prendre.",
    "- takeaways : 3 MAXIMUM, les enseignements qui comptent APRÈS la priorité (puces courtes).",
    "- actions : 3 MAXIMUM, à l'impératif, jamais un doublon de la priorité. Tableau vide si rien de solide à proposer.",
  ].join("\n");

  const lines: string[] = [`Sondage : "${surveyTitle}"`, `Nombre de participants : ${aggregate.totalResponses}`, ""];
  lines.push(...renderQuestionsForPrompt(aggregate.questions, aggregate.totalResponses, { samples: 25 }));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  let res: Response;
  try {
    res = await fetchAnthropic(CLAUDE_API_URL, {
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
    priority: parsed.priority,
    takeaways: parsed.takeaways,
    actions: parsed.actions,
    responses_at_generation: aggregate.totalResponses,
    model,
    generated_at: new Date().toISOString(),
  };
}

function parseAnalysisJson(raw: string): {
  summary: string;
  priority: { title: string; why: string; how: string } | null;
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
    // Le plafond vit dans le CODE et pas seulement dans la consigne :
    // un modele qui deborde ne doit pas pouvoir re-assommer la creatrice.
    const toStringArray = (v: unknown): string[] =>
      capSecondary(Array.isArray(v) ? v.map((x) => sanitizeAiText(String(x).trim())).filter(Boolean) : []);
    const toStr = (v: unknown): string => (typeof v === "string" ? sanitizeAiText(v.trim()) : "");
    const p = (obj.priority ?? null) as Record<string, unknown> | null;
    return {
      summary: toStr(obj.summary),
      priority:
        p && typeof p === "object" && toStr(p.title)
          ? { title: toStr(p.title), why: toStr(p.why), how: toStr(p.how) }
          : null,
      takeaways: toStringArray(obj.takeaways),
      actions: toStringArray(obj.actions),
    };
  } catch {
    return { summary: sanitizeAiText(raw.trim().slice(0, 1000)), priority: null, takeaways: [], actions: [] };
  }
}
