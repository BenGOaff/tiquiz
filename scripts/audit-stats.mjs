#!/usr/bin/env node
// scripts/audit-stats.mjs
//
// AUDIT RÉEL des statistiques d'un quiz (Béné 2 juin 2026 — "je veux
// ENFIN des statistiques fiables et ne pas attendre les retours des
// users pour corriger bug par bug").
//
// Pour un quiz donné (ou tous), dump la VÉRITÉ depuis la DB et détecte
// les incohérences :
//   - Compteurs dénormalisés (quizzes.views_count / starts / completions / shares)
//   - Comptes réels depuis quiz_events par event_type
//   - Compte réel des leads (quiz_leads)
//   - Dates min/max (quand le tracking a commencé vs quand les leads sont arrivés)
//   - VERDICT : où exactement les chiffres divergent et pourquoi
//
// Usage :
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//     node scripts/audit-stats.mjs <quizId-ou-slug>
//
//   # Sans argument : audite les 20 quiz avec le plus de leads
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/audit-stats.mjs
//
// Read-only. Exit 0 toujours (c'est un outil de diagnostic, pas un test).

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  process.env.SUPABASE_PROJECT_URL;
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_SERVICE_ROLE ??
  process.env.SERVICE_ROLE_KEY ??
  process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("ENV manquantes : SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY");
  process.exit(2);
}

const supa = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const arg = process.argv[2];

async function countEvents(quizId, eventType) {
  const { count } = await supa
    .from("quiz_events")
    .select("id", { count: "exact", head: true })
    .eq("quiz_id", quizId)
    .eq("event_type", eventType);
  return count ?? 0;
}

async function countLeads(quizId) {
  const { count } = await supa
    .from("quiz_leads")
    .select("id", { count: "exact", head: true })
    .eq("quiz_id", quizId);
  return count ?? 0;
}

async function dateRange(table, quizId, extraEq) {
  let qMin = supa.from(table).select("created_at").eq("quiz_id", quizId).order("created_at", { ascending: true }).limit(1);
  let qMax = supa.from(table).select("created_at").eq("quiz_id", quizId).order("created_at", { ascending: false }).limit(1);
  if (extraEq) {
    qMin = qMin.eq(extraEq.col, extraEq.val);
    qMax = qMax.eq(extraEq.col, extraEq.val);
  }
  const [{ data: minD }, { data: maxD }] = await Promise.all([qMin.maybeSingle(), qMax.maybeSingle()]);
  return {
    min: minD?.created_at ?? null,
    max: maxD?.created_at ?? null,
  };
}

async function auditOne(quiz) {
  const quizId = quiz.id;
  console.log("\n══════════════════════════════════════════════════════════");
  console.log(`QUIZ : ${quiz.title ?? "(sans titre)"} `);
  console.log(`  id=${quizId}  slug=${quiz.slug ?? "—"}  mode=${quiz.mode ?? "quiz"}  status=${quiz.status}`);
  console.log(`  créé le : ${quiz.created_at}`);

  // 1. Compteurs dénormalisés
  console.log("\n  [Compteurs dénormalisés — quizzes.*_count]");
  console.log(`    views_count       = ${quiz.views_count ?? 0}`);
  console.log(`    starts_count      = ${quiz.starts_count ?? 0}`);
  console.log(`    completions_count = ${quiz.completions_count ?? 0}`);
  console.log(`    shares_count      = ${quiz.shares_count ?? 0}`);

  // 2. Comptes réels depuis quiz_events
  const [evViews, evStarts, evCompletes, evShares] = await Promise.all([
    countEvents(quizId, "view"),
    countEvents(quizId, "start"),
    countEvents(quizId, "complete"),
    countEvents(quizId, "share"),
  ]);
  console.log("\n  [Comptes réels — quiz_events]");
  console.log(`    view     = ${evViews}`);
  console.log(`    start    = ${evStarts}`);
  console.log(`    complete = ${evCompletes}`);
  console.log(`    share    = ${evShares}`);

  // 3. Leads
  const leads = await countLeads(quizId);
  console.log("\n  [Leads — quiz_leads]");
  console.log(`    total = ${leads}`);

  // 4. Dates : quand le tracking a commencé vs quand les leads sont arrivés
  const [leadDates, viewDates] = await Promise.all([
    dateRange("quiz_leads", quizId),
    dateRange("quiz_events", quizId, { col: "event_type", val: "view" }),
  ]);
  console.log("\n  [Fenêtres temporelles]");
  console.log(`    premier lead       : ${leadDates.min ?? "—"}`);
  console.log(`    dernier lead        : ${leadDates.max ?? "—"}`);
  console.log(`    première vue trackée: ${viewDates.min ?? "—"}`);
  console.log(`    dernière vue trackée: ${viewDates.max ?? "—"}`);

  // 5. VERDICT
  console.log("\n  [VERDICT]");
  const problems = [];

  // Incohérence compteur dénormalisé vs events
  if (Math.abs((quiz.views_count ?? 0) - evViews) > Math.max(5, evViews * 0.1)) {
    problems.push(
      `Compteur views_count (${quiz.views_count ?? 0}) DIVERGE de quiz_events view (${evViews}). ` +
      `Le trigger a raté des events OU le compteur a été modifié hors trigger.`,
    );
  }

  // Plus de leads que de vues = impossible physiquement
  const bestViews = Math.max(quiz.views_count ?? 0, evViews);
  if (leads > bestViews) {
    problems.push(
      `LEADS (${leads}) > VUES (max compteur/events = ${bestViews}). ` +
      `Physiquement impossible — des leads ont été captés SANS vue trackée.`,
    );
    // Pourquoi ?
    if (leadDates.min && viewDates.min && new Date(leadDates.min) < new Date(viewDates.min)) {
      problems.push(
        `  → CAUSE PROBABLE : des leads sont ANTÉRIEURS à la première vue trackée ` +
        `(premier lead ${leadDates.min} < première vue ${viewDates.min}). ` +
        `Le quiz a capté des leads AVANT que le tracking de vues existe/fonctionne.`,
      );
    }
    if (!viewDates.min) {
      problems.push(
        `  → CAUSE PROBABLE : AUCUNE vue n'a jamais été trackée dans quiz_events. ` +
        `Le quiz est probablement embarqué (iframe/funnel) où le /track ne se déclenche pas, ` +
        `ou prédate entièrement le tracking de vues (21 mai 2026).`,
      );
    }
  }

  // Taux de capture réaliste
  if (bestViews > 0) {
    const rate = Math.round((leads / bestViews) * 1000) / 10;
    console.log(`    Taux de capture réel (leads/bestViews) = ${rate}%`);
    if (rate > 100) {
      problems.push(`Taux de capture ${rate}% > 100% = données de vues incomplètes.`);
    }
  }

  if (problems.length === 0) {
    console.log("    ✓ Cohérent : vues >= leads, compteurs alignés.");
  } else {
    for (const p of problems) console.log(`    ✗ ${p}`);
  }
}

async function main() {
  console.log(`▶ Audit stats Tiquiz (${SUPABASE_URL})`);

  if (arg) {
    // Résolution par id OU slug
    let { data: quiz } = await supa
      .from("quizzes")
      .select("id, title, slug, mode, status, created_at, views_count, starts_count, completions_count, shares_count")
      .eq("id", arg)
      .maybeSingle();
    if (!quiz) {
      const { data: bySlug } = await supa
        .from("quizzes")
        .select("id, title, slug, mode, status, created_at, views_count, starts_count, completions_count, shares_count")
        .eq("slug", arg)
        .maybeSingle();
      quiz = bySlug;
    }
    if (!quiz) {
      console.error(`Quiz introuvable : ${arg}`);
      process.exit(1);
    }
    await auditOne(quiz);
  } else {
    // Top 20 quiz par views_count (les plus actifs = les plus à risque)
    const { data: quizzes } = await supa
      .from("quizzes")
      .select("id, title, slug, mode, status, created_at, views_count, starts_count, completions_count, shares_count")
      .order("views_count", { ascending: false, nullsFirst: false })
      .limit(20);
    if (!quizzes || quizzes.length === 0) {
      console.log("Aucun quiz trouvé.");
      process.exit(0);
    }
    console.log(`  Audit des ${quizzes.length} quiz les plus actifs.`);
    for (const q of quizzes) {
      await auditOne(q);
    }
  }

  console.log("\n══════════════════════════════════════════════════════════");
  console.log("Audit terminé. Cherche les lignes '✗' = incohérences détectées.");
  process.exit(0);
}

main().catch((e) => {
  console.error("Erreur fatale :", e);
  process.exit(2);
});
