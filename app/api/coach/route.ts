// app/api/coach/route.ts
// Coach IA : GET = historique, POST = envoyer un message.
// Auth + enrollment requis. Limite de messages par jour. Garde-fous
// anti-hallucination dans le prompt systeme (lib/coach/knowledge.ts).
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getViewer, getDaysWithProgress, snapshotFromDays } from "@/lib/parcours";
import { getCarnet } from "@/lib/carnet";
import { resolveAnthropicModel } from "@/lib/anthropicModel";
import { buildClaudeMessageBody } from "@/lib/claudeRequest";
import { sanitizeAiText } from "@/lib/aiTextSanitizer";
import {
  buildCoachSystemPrompt,
  extractEscalation,
  type CoachAnswer,
  type CoachQuizContext,
} from "@/lib/coach/knowledge";
import { sendEmail } from "@/lib/email/resend";
import { coachEscalationEmail } from "@/lib/email/templates";
import { ESCALATION_ALERT_EMAILS } from "@/lib/adminEmails";
import { getTiquizConnection, fetchQuizAudit } from "@/lib/integrations/tiquiz";
import { computeTiquizInsights } from "@/lib/insights/tiquizInsights";
import { auditQuiz } from "@/lib/quizDoctor";

const DAILY_LIMIT = 40; // messages eleve par jour
const HISTORY_LIMIT = 12; // messages passes envoyes en contexte

async function getOrCreateThread(
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>,
  userId: string,
): Promise<string | null> {
  const { data: existing } = await supabase
    .from("coach_threads")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (existing) return existing.id as string;

  const { data: created, error } = await supabase
    .from("coach_threads")
    .insert({ user_id: userId })
    .select("id")
    .single();
  if (error || !created) return null;
  return created.id as string;
}

/**
 * Appelle l'API Anthropic avec un retry unique : sur erreur reseau ou 5xx
 * (et 429), on retente une fois ; sur 4xx definitif, on abandonne. Evite le
 * "coach muet" sur un blip transitoire. Renvoie le texte, ou null si echec.
 */
async function callAnthropicWithRetry(apiKey: string, body: unknown): Promise<string | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        // Trace du prompt caching : cache_creation = 1er appel (on ecrit le
        // cache), cache_read = appels suivants (on lit le cache, facture ~10%).
        // Sert a confirmer en prod que le cache prend bien.
        const u = data?.usage;
        if (u && (u.cache_creation_input_tokens || u.cache_read_input_tokens)) {
          console.log(
            `[coach] cache write=${u.cache_creation_input_tokens ?? 0} read=${u.cache_read_input_tokens ?? 0} input=${u.input_tokens ?? 0}`,
          );
        }
        return Array.isArray(data?.content)
          ? data.content
              .filter((b: { type?: string }) => b.type === "text")
              .map((b: { text?: string }) => b.text)
              .join("")
          : "";
      }
      // 4xx (hors 429) : rejouer ne changera rien, echec definitif.
      if (res.status < 500 && res.status !== 429) return null;
    } catch {
      // Erreur reseau : on retente une fois.
    }
  }
  return null;
}

export async function GET() {
  const viewer = await getViewer();
  if (!viewer || !viewer.enrolled) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }
  const supabase = await getSupabaseServerClient();
  const threadId = await getOrCreateThread(supabase, viewer.userId);
  if (!threadId) return NextResponse.json({ ok: true, messages: [] });

  const { data: messages } = await supabase
    .from("coach_messages")
    .select("role, content, created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .limit(100);

  return NextResponse.json({ ok: true, messages: messages ?? [] });
}

const bodySchema = z.object({
  message: z.string().min(1).max(2000),
  dayNumber: z.number().int().optional(),
  // true quand le message vient du bouton "Un blocage ?" : on le logue en
  // feedback (pour le dashboard admin d'amelioration), en plus d'y repondre.
  blocage: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: false, reason: "not_configured" }, { status: 503 });
  }

  const viewer = await getViewer();
  if (!viewer || !viewer.enrolled) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, reason: "bad_body" }, { status: 400 });
  }
  const { message, dayNumber, blocage } = parsed.data;

  const supabase = await getSupabaseServerClient();

  // Limite par jour (anti-abus + maitrise du cout).
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  const { count } = await supabase
    .from("coach_messages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", viewer.userId)
    .eq("role", "user")
    .gte("created_at", since.toISOString());
  if ((count ?? 0) >= DAILY_LIMIT) {
    return NextResponse.json({ ok: false, reason: "rate_limited" }, { status: 429 });
  }

  // Base de connaissance : les jours publies.
  const { data: days } = await supabase
    .from("days")
    .select("id, day_number, title, subtitle, intro_html")
    .eq("status", "published")
    .order("sort_order", { ascending: true });

  const currentDay = dayNumber != null ? (days ?? []).find((d) => d.day_number === dayNumber) ?? null : null;

  // Reponses de l'eleve sur le jour en cours (personnalisation).
  let currentAnswers: CoachAnswer[] = [];
  if (currentDay) {
    const { data: qs } = await supabase
      .from("questions")
      .select("id, prompt")
      .eq("day_id", currentDay.id);
    const { data: ans } = await supabase
      .from("answers")
      .select("question_id, value_text, value_choice")
      .eq("user_id", viewer.userId)
      .eq("day_id", currentDay.id);
    const promptById = new Map((qs ?? []).map((q) => [q.id as string, q.prompt as string]));
    currentAnswers = (ans ?? [])
      .map((a) => ({
        prompt: promptById.get(a.question_id as string) ?? "",
        value: (a.value_text || a.value_choice || "") as string,
      }))
      .filter((a) => a.prompt && a.value);
  }

  // Instruction (editable par l'admin) + documents de connaissance.
  // Lus via service_role : tables internes, pas user-specific.
  const [{ data: settings }, { data: knowledge }] = await Promise.all([
    supabaseAdmin.from("coach_settings").select("instruction").eq("id", "default").maybeSingle(),
    supabaseAdmin
      .from("coach_knowledge")
      .select("title, content")
      .eq("enabled", true)
      .order("sort_order", { ascending: true }),
  ]);

  // Avancement dans le parcours + carnet complet : le coach sait ou en est
  // l'eleve et ce qu'il a deja produit, meme hors des pages jour.
  const [daysProgress, carnetDays] = await Promise.all([
    getDaysWithProgress(viewer.userId),
    getCarnet(viewer.userId),
  ]);
  const snap = snapshotFromDays(daysProgress);
  const activeDay =
    daysProgress.find((d) => !d.is_bonus && d.unlocked && d.progress !== "completed") ?? null;
  const progress = {
    completedParcoursDays: snap.completedParcoursDays,
    totalParcoursDays: snap.totalParcoursDays,
    activeDayNumber: activeDay?.day_number ?? null,
    completedBonusCount: snap.completedBonusCount,
  };
  const carnet = carnetDays.map((d) => ({
    dayNumber: d.dayNumber,
    title: d.title,
    isBonus: d.isBonus,
    entries: d.entries.map((e) => ({ prompt: e.prompt, answer: e.answer })),
  }));

  // Le quiz Tiquiz de l'eleve : structure + audit + profils, pour que le
  // coach l'aide a l'ameliorer (best-effort : null si non connecte).
  let quizContext: CoachQuizContext | null = null;
  try {
    const quizzes = (await fetchQuizAudit(viewer.userId)) ?? [];
    if (quizzes.length > 0) {
      // Quiz le plus pertinent : publie d'abord, puis le plus de profils.
      const best = quizzes
        .slice()
        .sort((a, b) => {
          const act = (a.status === "active" ? 1 : 0) - (b.status === "active" ? 1 : 0);
          if (act !== 0) return -act;
          return (b.resultProfiles?.length ?? b.results) - (a.resultProfiles?.length ?? a.results);
        })[0];
      quizContext = {
        title: best.title,
        status: best.status,
        issues: auditQuiz(best).map((i) => ({ title: i.title, fix: i.fix })),
        profiles: (best.resultProfiles ?? []).map((p) => ({
          title: p.title,
          hasCta: Boolean((p.ctaText && p.ctaText.trim()) || (p.ctaUrl && p.ctaUrl.trim())),
        })),
      };
    }
  } catch {
    // Non connecte ou endpoint indisponible : le coach fonctionne sans.
  }

  const { cacheablePrefix, dynamic } = buildCoachSystemPrompt({
    instruction: settings?.instruction ?? null,
    docs: knowledge ?? [],
    days: days ?? [],
    currentDay,
    firstName: viewer.profile?.full_name?.split(" ")[0] ?? null,
    niche: viewer.profile?.niche ?? null,
    activityType: viewer.profile?.activity_type ?? null,
    maturity: viewer.profile?.maturity ?? null,
    monetization: viewer.profile?.monetization ?? null,
    adsBudget: viewer.profile?.ads_budget ?? null,
    currentAnswers,
    progress,
    carnet,
    quizContext,
  });

  // Coach proactif : on injecte les signaux REELS du funnel Tiquiz (si
  // connecte et si une fuite claire est detectee), pour que le coach
  // conseille a partir des vrais chiffres, en priorite. Ces signaux
  // varient par eleve -> partie DYNAMIQUE (jamais cachee).
  let dynamicPart = dynamic;
  try {
    const connection = await getTiquizConnection(viewer.userId);
    // On remonte TOUS les insights (deja bornes a 2, chacun = 1 constat +
    // 1 action) : les fuites a corriger MAIS AUSSI les succes (feliciter,
    // passer a l'echelle) et le manque de volume (guider vers la diffusion).
    const insights = computeTiquizInsights(connection?.metrics ?? null);
    if (insights.length > 0) {
      const lines = insights
        .map((i) => {
          const tag =
            i.tone === "bravo" ? "SUCCÈS" : i.tone === "info" ? "CONTEXTE" : "À CORRIGER";
          return `- [${tag}] ${i.title} ACTION : ${i.action}`;
        })
        .join("\n");
      dynamicPart +=
        "\n\n=== SIGNAUX RÉELS DE SON FUNNEL TIQUIZ (chiffres à jour, à prioriser) ===\n" +
        lines +
        "\nAppuie-toi EN PRIORITÉ sur ces signaux réels : félicite quand c'est un succès, corrige quand c'est une fuite, guide vers la diffusion quand le volume manque.";
    }
  } catch {
    // Pas de signaux disponibles : le coach fonctionne normalement.
  }

  // Prompt système en deux blocs pour le prompt caching Anthropic :
  //   1. Le prefixe STABLE (persona + règles + faits Tiquiz + programme +
  //      docs admin), marqué cache_control -> facturé ~10% après le 1er
  //      appel et partagé entre tous les élèves (même préfixe exact).
  //   2. La partie DYNAMIQUE (contexte de l'élève), jamais cachée.
  // Le cache éphémère dure ~5 min : sur une session de coaching (plusieurs
  // messages) et entre élèves, les hits sont fréquents.
  const system: Array<Record<string, unknown>> = [
    { type: "text", text: cacheablePrefix, cache_control: { type: "ephemeral" } },
  ];
  if (dynamicPart.trim()) {
    system.push({ type: "text", text: dynamicPart });
  }

  const threadId = await getOrCreateThread(supabase, viewer.userId);
  if (!threadId) return NextResponse.json({ ok: false, reason: "db" }, { status: 500 });

  // Historique recent pour le contexte de conversation.
  const { data: past } = await supabase
    .from("coach_messages")
    .select("role, content")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: false })
    .limit(HISTORY_LIMIT);
  const history = (past ?? [])
    .reverse()
    .map((m) => ({ role: m.role as string, content: m.content as string }));

  const model = resolveAnthropicModel(process.env.ANTHROPIC_MODEL, "sonnet");
  const body = buildClaudeMessageBody({
    model,
    max_tokens: 900,
    system,
    messages: [...history, { role: "user", content: message }],
  });

  const text = await callAnthropicWithRetry(apiKey, body);
  if (text == null) {
    return NextResponse.json({ ok: false, reason: "ai_error" }, { status: 502 });
  }
  // Marqueur d'escalade [[ESCALADE: ...]] : le coach le pose quand il ne sait
  // pas repondre ou que l'eleve signale un bug. On l'EXTRAIT et on le RETIRE
  // AVANT sanitisation/affichage : il ne doit JAMAIS etre montre a l'eleve.
  const { text: withoutMarker, reason: escalationReason } = extractEscalation(text || "");
  let reply = sanitizeAiText(withoutMarker.trim());
  if (!reply) reply = "Désolée, je n'ai pas réussi à répondre. Reformule, ou pose la question dans la communauté.";

  // Persiste les deux messages (le carnet de conversation de l'eleve).
  const now = new Date();
  await supabase.from("coach_messages").insert([
    { thread_id: threadId, user_id: viewer.userId, role: "user", content: message, created_at: now.toISOString() },
    { thread_id: threadId, user_id: viewer.userId, role: "assistant", content: reply, created_at: new Date(now.getTime() + 1).toISOString() },
  ]);

  // Blocage : on logue aussi en feedback pour le dashboard admin
  // d'amelioration (chantier D). Best-effort, ne bloque pas la reponse.
  if (blocage) {
    await supabase
      .from("feedback")
      .insert({
        user_id: viewer.userId,
        day_number: dayNumber ?? null,
        kind: "blocage",
        message: message.trim(),
      })
      .then(
        () => undefined,
        () => undefined,
      );
  }

  // Escalade : le coach a posé le marqueur (il ne sait pas répondre, ou l'élève
  // a signalé un bug qui demande Béné). On enregistre une ligne (table interne
  // admin, via service_role : la RLS interdit l'écriture côté élève) et on
  // prévient Béné par email, avec un throttle pour ne pas la spammer sur une
  // rafale du même élève. Best-effort : ne casse jamais la réponse au coach.
  if (escalationReason !== null) {
    try {
      const THROTTLE_MIN = 30;
      const windowStart = new Date(Date.now() - THROTTLE_MIN * 60_000).toISOString();
      const { data: recent } = await supabaseAdmin
        .from("coach_escalations")
        .select("id")
        .eq("user_id", viewer.userId)
        .eq("resolved", false)
        .gte("created_at", windowStart)
        .limit(1);
      const throttled = (recent?.length ?? 0) > 0;

      const reason = escalationReason || "Non précisé";
      await supabaseAdmin.from("coach_escalations").insert({
        user_id: viewer.userId,
        student_email: viewer.email ?? null,
        thread_id: threadId,
        day_number: dayNumber ?? null,
        question: message.trim(),
        reason,
      });

      // Un seul email par fenêtre de throttle, en UN SEUL envoi groupé aux
      // destinataires d'alerte (cf. ESCALATION_ALERT_EMAILS). Avant, on
      // bouclait sur chaque admin -> Béné recevait 2 emails (ses 2 adresses
      // admin tombent dans la même boîte). Si l'email n'est pas configuré,
      // sendEmail renvoie { ok:false } sans jamais throw.
      if (!throttled && ESCALATION_ALERT_EMAILS.length > 0) {
        const { subject, html } = coachEscalationEmail({
          studentEmail: viewer.email ?? null,
          question: message.trim(),
          reason,
          dayNumber: dayNumber ?? null,
        });
        await sendEmail({ to: [...ESCALATION_ALERT_EMAILS], subject, html });
      }
    } catch {
      // Une escalade ratée ne doit jamais empêcher l'élève de recevoir sa réponse.
    }
  }

  return NextResponse.json({ ok: true, reply });
}
