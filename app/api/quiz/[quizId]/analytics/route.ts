// GET /api/quiz/[quizId]/analytics?period=7|30|90|all
//
// Aggregates the metrics for a quiz the caller owns. Read-only — all
// counters live on the quizzes table (views_count, completions_count)
// or are derived from the leads table on the fly. No new tables, no
// migration : we leverage what's already wired by the public quiz
// endpoint and the lead capture flow.
//
// Drop-off per question isn't computable yet (needs a quiz_session
// events table). Tracked as a follow-up.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { dateKeyForOffset, parseTzOffset } from "@/lib/dateKeys";
import { stripHtml } from "@/lib/richText";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PeriodKey = "7" | "30" | "90" | "all";

function parsePeriod(raw: string | null): { key: PeriodKey; sinceISO: string | null } {
  const k = (raw ?? "30").toLowerCase();
  if (k === "7" || k === "30" || k === "90") {
    const days = Number(k);
    const d = new Date();
    d.setDate(d.getDate() - days);
    return { key: k as PeriodKey, sinceISO: d.toISOString() };
  }
  return { key: "all", sinceISO: null };
}


export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ quizId: string }> },
) {
  const { quizId } = await ctx.params;
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const reqUrl = new URL(req.url);
  const period = parsePeriod(reqUrl.searchParams.get("period"));
  // Fuseau du client pour bucketiser le graphe sur son jour local.
  const tzOffset = parseTzOffset(reqUrl.searchParams.get("tz"));

  // Ownership + base counters in one shot
  const { data: quiz, error: quizErr } = await supabase
    .from("quizzes")
    .select("id, title, views_count, completions_count, created_at")
    .eq("id", quizId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (quizErr || !quiz) {
    return NextResponse.json(
      { ok: false, error: "Quiz introuvable" },
      { status: 404 },
    );
  }

  // ════════════════════════════════════════════════════════════════
  // STATISTIQUES — refonte fiabilité (Béné 2 juin 2026)
  //
  // RÈGLE D'OR : on ne mélange JAMAIS deux fenêtres temporelles ni deux
  // sources dans un même ratio. Avant, le bug était double :
  //   1. leadsCount filtré sur la période (30j) MAIS viewsCount lifetime
  //      → ratio incohérent (pommes / poires).
  //   2. vues depuis quiz_events (aucun backfill avant 21 mai 2026) vs
  //      leads depuis quiz_leads (lifetime) → pour un vieux quiz, vues
  //      structurellement < leads → taux > 100% absurde (794% chez Gwenn).
  //
  // NOUVELLE ARCHITECTURE :
  //   - Les KPI cards (labellées "cumulé depuis le début") = LIFETIME,
  //     vues ET leads sur la même base lifetime.
  //   - La time-series + distribution = filtrées par la période choisie.
  //   - Le taux de capture est HONNÊTE : si les vues trackées sont
  //     inférieures aux leads (= vues incomplètes, quiz embarqué ou
  //     antérieur au tracking), on ne fabrique PAS un faux 100% — on
  //     renvoie viewsReliable=false et captureRate=null, l'UI affiche
  //     un état explicite au lieu d'un chiffre mensonger.
  // ════════════════════════════════════════════════════════════════

  // ── A) LEADS — deux comptes distincts ──
  // Lifetime (pour les KPI) + période (pour la time-series + distribution).
  const { count: lifetimeLeadsCount } = await supabase
    .from("quiz_leads")
    .select("id", { count: "exact", head: true })
    .eq("quiz_id", quizId);
  const { count: lifetimeExportedSio } = await supabase
    .from("quiz_leads")
    .select("id", { count: "exact", head: true })
    .eq("quiz_id", quizId)
    .eq("sio_synced", true);

  // Leads de la PÉRIODE (time-series + distribution) — agrégés DANS la
  // base, sans plafond (avant : cap 5000 → sous-comptage des quiz viraux).
  // Deux vues : par jour (graphe) et groupés par (result_id, result_title)
  // pour la distribution. On groupe sur la clé STABLE result_id (pas le
  // titre figé à la capture) — cf. bug 2 juin 2026 : 233/276 leads
  // bucketisés "Sans résultat". Appels via `supabase` (RLS owner-scoped).
  const [leadsDailyRes, leadsByResultRes] = await Promise.all([
    supabase.rpc("quiz_leads_daily", { p_quiz_id: quizId, p_tz_offset: tzOffset, p_since: period.sinceISO }),
    supabase.rpc("quiz_leads_by_result", { p_quiz_id: quizId, p_since: period.sinceISO }),
  ]);
  if (leadsByResultRes.error) {
    return NextResponse.json(
      { ok: false, error: leadsByResultRes.error.message },
      { status: 400 },
    );
  }
  const leadsDailyRows = (leadsDailyRes.data ?? []) as { day: string; n: number }[];
  const leadsByResultRows = (leadsByResultRes.data ?? []) as {
    result_id: string | null;
    result_title: string | null;
    n: number;
  }[];

  // Compte lifetime des leads (KPI). leadsCount = lifetime, PAS période.
  const leadsCount = lifetimeLeadsCount ?? 0;
  const exportedSio = lifetimeExportedSio ?? 0;

  // ── B) VUES + COMPLÉTIONS lifetime — double source réconciliée ──
  // On prend le MAX entre le compteur dénormalisé quizzes.views_count
  // (qui inclut l'historique pré-refonte, server-side) et le compte réel
  // quiz_events (fiable mais seulement depuis le 21 mai 2026). Le max
  // donne la meilleure estimation lifetime disponible.
  const [viewsEventsRes, completesEventsRes] = await Promise.all([
    supabaseAdmin
      .from("quiz_events")
      .select("id", { count: "exact", head: true })
      .eq("quiz_id", quizId)
      .eq("event_type", "view"),
    supabaseAdmin
      .from("quiz_events")
      .select("id", { count: "exact", head: true })
      .eq("quiz_id", quizId)
      .eq("event_type", "complete"),
  ]);
  const viewsFromEvents = viewsEventsRes.error ? 0 : viewsEventsRes.count ?? 0;
  const completesFromEvents = completesEventsRes.error ? 0 : completesEventsRes.count ?? 0;

  const trackedViews = Math.max(quiz.views_count ?? 0, viewsFromEvents);
  const completionsCount = Math.max(quiz.completions_count ?? 0, completesFromEvents);

  // ── C) Taux de capture HONNÊTE ──
  // viewsReliable = false si on a plus de leads que de vues trackées
  // (impossible physiquement → vues incomplètes pour ce quiz).
  const viewsReliable = trackedViews >= leadsCount;
  // viewsCount affiché : on ne montre jamais moins de vues que de leads
  // (incohérent visuellement). Plancher à leadsCount.
  const viewsCount = Math.max(trackedViews, leadsCount);
  // captureRate : calculé UNIQUEMENT quand les vues sont fiables.
  // Sinon null → l'UI affiche "—" + note "vues partiellement trackées".
  const captureRate =
    viewsReliable && viewsCount > 0
      ? Math.round((leadsCount / viewsCount) * 1000) / 10
      : null;

  // Distribution par résultat — refonte 2 juin 2026 (Béné).
  //
  // AVANT : on groupait par result_title (snapshot stocké au moment de la
  // capture). Deux conséquences fausses observées en prod :
  //   1. Si un lead a result_id rempli mais result_title null/vide (bug
  //      historique sur certains parcours), il tombait dans "Sans résultat"
  //      alors qu'il a en fait un résultat → chez Gwenn 233/276 = 84% bucketisés
  //      "Sans résultat" alors que tous ont un profil.
  //   2. Si Béné renomme un profil dans l'éditeur, les leads passés gardent
  //      leur ancien titre figé → la légende du donut affiche l'ancien nom.
  //
  // FIX : on groupe par result_id (clé STABLE), et on résout le titre
  // actuel depuis quiz_results au moment du rendu. Le snapshot result_title
  // ne sert plus que de fallback pour les leads orphelins (result_id null
  // = profil supprimé depuis, ON DELETE SET NULL — cf. migration 030).
  const { data: currentResults } = await supabaseAdmin
    .from("quiz_results")
    .select("id, title")
    .eq("quiz_id", quizId);
  const currentTitleById = new Map<string, string>(
    (currentResults ?? []).map((r) => [r.id as string, (r.title as string) ?? ""]),
  );

  // ─── Distribution par titre RESOLU (refonte fiabilite 16 juillet 2026) ─
  // Bene 8 juin : "je veux que mes users voient leur quiz EXISTANT, en
  // temps reel". Source de verite = quiz_results actuel.
  //
  // BUG CORRIGE (drame Adeline 16 juillet) : avant, tous les leads a
  // result_id null (orphelins apres qu'un save a recree les profils) etaient
  // regroupes sous UNE cle unique, puis TOUT le paquet etait attribue au
  // PREMIER titre-snapshot vu. Resultat : 127 leads sautaient d'un profil a
  // l'autre d'un jour a l'autre selon l'ordre des lignes du RPC. On resout
  // desormais le titre LIGNE PAR LIGNE (le RPC groupe deja par
  // (result_id, result_title)), donc chaque snapshot garde son compte.
  //
  // Algo (inchange) :
  //   1. Seed byTitle avec TOUS les profils current (count = 0 inclus).
  //   2. Par ligne : match via result_id -> titre LIVE (suit les renames),
  //      sinon via le snapshot result_title s'il existe encore. Sinon exclu.
  //   3. Pourcentages sur le total MATCHE. Sort par count desc.
  // Match sur le titre NORMALISE (stripHtml : sans balises, nbsp/espaces
  // ecrases, entites decodees) pour reunir les leads captes sous des mises
  // en forme differentes du MEME profil (drame Adeline : 3 leads captes quand
  // "L'Hyper-adaptation" etait en texte simple, avant qu'elle lui ajoute une
  // couleur -> en brut ils ne matchaient plus). L'affichage garde le titre
  // courant BRUT (la page gere le HTML). Aligne sur QuizResultsAnalytics.
  const byTitle = new Map<string, number>(); // cle = titre courant brut (affichage)
  const normToRaw = new Map<string, string>(); // titre normalise -> titre courant brut
  for (const r of currentResults ?? []) {
    const raw = ((r.title as string) ?? "").trim();
    if (!raw) continue;
    const key = stripHtml(raw);
    if (!key) continue;
    if (!byTitle.has(raw)) byTitle.set(raw, 0);
    if (!normToRaw.has(key)) normToRaw.set(key, raw);
  }

  for (const row of leadsByResultRows) {
    const n = Number(row.n) || 0;
    if (n <= 0) continue;
    // 1) titre LIVE via result_id (suit les renames), 2) sinon snapshot.
    let raw: string | undefined;
    if (row.result_id) {
      const live = currentTitleById.get(row.result_id);
      if (live) raw = normToRaw.get(stripHtml(live));
    }
    if (!raw && row.result_title) raw = normToRaw.get(stripHtml(row.result_title));
    if (raw) byTitle.set(raw, (byTitle.get(raw) ?? 0) + n);
    // sinon: orphelin / ancien nom -> exclu silencieusement.
  }

  let matchedTotal = 0;
  for (const v of byTitle.values()) matchedTotal += v;

  const resultDistribution = Array.from(byTitle.entries())
    .map(([title, count]) => ({
      title,
      count,
      pct:
        matchedTotal > 0
          ? Math.round((count / matchedTotal) * 1000) / 10
          : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // ── VUES quotidiennes (demande Gwenn 29 juin 2026) ──
  // Source FIABLE : quiz_events (event_type='view'), agrégé DANS la base via
  // la RPC daily_quiz_views (GROUP BY jour). Aucun plafond : que le quiz ait
  // 1 000 ou 10 millions de vues, on ne récupère qu'une ligne par jour. Le
  // bucketing jour-local (p_tz_offset) reproduit dateKeyForOffset à l'identique
  // côté SQL → la ligne "vues" et la ligne "inscrits" sont alignées au jour
  // près, et on peut calculer un taux de conversion par jour.
  const { data: viewsDailyRaw } = await supabaseAdmin.rpc("daily_quiz_views", {
    p_quiz_id: quizId,
    p_tz_offset: tzOffset,
    p_since: period.sinceISO,
  });
  const viewsDaily = (viewsDailyRaw ?? []) as { day: string; views: number }[];
  const viewsDayMap = new Map<string, number>();
  for (const r of viewsDaily) {
    viewsDayMap.set(r.day, Number(r.views) || 0);
  }
  const viewDayKeys = [...viewsDayMap.keys()].sort();

  // Série quotidienne : leads ET vues, déjà agrégés par jour LOCAL en SQL
  // (même formule dateKeyForOffset). Fill des jours manquants à 0.
  const leadsDayMap = new Map<string, number>();
  for (const r of leadsDailyRows) {
    leadsDayMap.set(r.day, (leadsDayMap.get(r.day) ?? 0) + Number(r.n));
  }
  const leadDayKeys = [...leadsDayMap.keys()].sort();
  const leadsByDay = (() => {
    if (leadDayKeys.length === 0 && viewDayKeys.length === 0) return [];
    // Ancre : début de période, sinon le plus ancien jour connu (lead OU
    // vue). Les clés-jour sont déjà locales ; on les situe à minuit UTC,
    // ce qui, pour tout fuseau réel (±12h), ne fait jamais sauter au jour
    // suivant (au pire une journée vide en tête, sans gravité).
    const firstTimes: number[] = [];
    if (leadDayKeys.length) firstTimes.push(new Date(leadDayKeys[0]! + "T00:00:00Z").getTime());
    if (viewDayKeys.length) firstTimes.push(new Date(viewDayKeys[0]! + "T00:00:00Z").getTime());
    const startMs = period.sinceISO
      ? new Date(period.sinceISO).getTime()
      : firstTimes.length
        ? Math.min(...firstTimes)
        : Date.now();
    const out: { date: string; count: number; views: number }[] = [];
    const endKey = dateKeyForOffset(new Date(), tzOffset);
    let t = startMs;
    let seen = "";
    const guard = Date.now() + 24 * 3600 * 1000;
    while (t <= guard) {
      const k = dateKeyForOffset(new Date(t), tzOffset);
      if (k !== seen) {
        out.push({ date: k, count: leadsDayMap.get(k) ?? 0, views: viewsDayMap.get(k) ?? 0 });
        seen = k;
      }
      if (k === endKey) break;
      t += 24 * 3600 * 1000;
    }
    return out.slice(-365);
  })();

  // exportRate = % des leads taggés dans SIO (lifetime, cohérent avec
  // les KPI). captureRate déjà calculé plus haut (honnête, nullable).
  const exportRate =
    leadsCount > 0
      ? Math.round((exportedSio / leadsCount) * 1000) / 10
      : 0;

  // ── Funnel: drop-off per question ──
  // We count distinct sessions that VIEWED each question. Drop-off
  // between Q[n] and Q[n+1] = (views[n] - views[n+1]) / views[n].
  // The ratio is enough to flag the worst-performing question; we
  // expose absolute counts too so the UI can show "47% on Q3".
  const funnel: {
    questionIndex: number;
    views: number;
    answers: number;
    dropFromPrevious: number;
  }[] = [];
  let totalSessions = 0;
  try {
    // Funnel agrégé DANS la base (RPC), sans plafond (avant : cap 50000).
    // La RPC renvoie déjà, par question_index croissant : views (monotone,
    // sessions ayant ATTEINT la question) + answers (sessions distinctes
    // ayant répondu). Monotone = un visiteur arrivé à Q5 a forcément passé
    // Q1-Q4, même si un event intermédiaire est perdu (cf. Gwenn 27 mai).
    const { data: funnelRows } = await supabaseAdmin.rpc("quiz_question_funnel_detail", {
      p_quiz_id: quizId,
      p_since: period.sinceISO,
    });
    const rows = (funnelRows ?? []) as {
      question_index: number;
      views: number;
      answers: number;
    }[];

    let prevViews = 0;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]!;
      const v = Number(r.views);
      const drop =
        i === 0 || prevViews === 0
          ? 0
          : Math.round(((prevViews - v) / prevViews) * 1000) / 10;
      funnel.push({
        questionIndex: r.question_index,
        views: v,
        answers: Number(r.answers),
        dropFromPrevious: Math.max(0, drop),
      });
      prevViews = v;
    }
    totalSessions = funnel[0]?.views ?? 0;
  } catch (e) {
    // Table/RPC might not exist yet on a fresh deploy — fail-open with
    // an empty funnel rather than 500 the whole analytics endpoint.
    console.warn("[quiz/analytics] funnel build failed:", e);
  }

  return NextResponse.json({
    ok: true,
    quiz: {
      id: quiz.id,
      title: quiz.title,
      created_at: quiz.created_at,
    },
    period: period.key,
    metrics: {
      // LIFETIME, source réconciliée max(compteur dénormalisé, quiz_events).
      viewsCount,
      completionsCount,
      leadsCount,
      exportedSioCount: exportedSio,
      // captureRate est NULL quand les vues sont incomplètes (viewsReliable
      // false) — l'UI affiche alors "—" + note honnête au lieu d'un 100% bidon.
      captureRate,
      // viewsReliable : false = ce quiz a capté des leads sans vue trackée
      // (embarqué/funnel/antérieur au tracking). Le taux n'est pas fiable.
      viewsReliable,
      exportRate,
    },
    resultDistribution,
    leadsByDay,
    funnel,
    totalFunnelSessions: totalSessions,
  });
}
