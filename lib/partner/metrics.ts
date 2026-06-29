// lib/partner/metrics.ts
// Agrege les metriques "a vie" d'un compte Tiquiz pour le pont FormaQuiz.
// Lecture seule, chiffres uniquement (aucune donnee perso de lead).
// Source de verite alignee sur /api/stats : compteurs sur `quizzes` +
// COUNT sur `quiz_leads`.
import "server-only";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export interface PartnerMetrics {
  leads: number;
  views: number;
  completes: number;
  shares: number;
  topQuiz: { title: string; leads: number } | null;
}

export async function getPartnerMetrics(userId: string): Promise<PartnerMetrics> {
  const { data: quizzes } = await supabaseAdmin
    .from("quizzes")
    .select("id, title, views_count, completions_count, shares_count")
    .eq("user_id", userId);

  const rows = quizzes ?? [];
  const ids = rows.map((q) => q.id as string);

  // Comptage leads par quiz agrégé DANS la base (RPC stats_leads_counts,
  // sans borne = lifetime) — plus de fetch ligne par ligne plafonné à 1000.
  const leadsByQuiz = new Map<string, number>();
  let leads = 0;
  if (ids.length > 0) {
    const { data: leadCounts } = await supabaseAdmin.rpc("stats_leads_counts", {
      p_quiz_ids: ids,
      p_since: null,
      p_until: null,
    });
    for (const r of (leadCounts ?? []) as { quiz_id: string; n: number }[]) {
      const c = Number(r.n) || 0;
      leads += c;
      leadsByQuiz.set(r.quiz_id, c);
    }
  }

  const views = rows.reduce((a, q) => a + (Number(q.views_count) || 0), 0);
  const completes = rows.reduce((a, q) => a + (Number(q.completions_count) || 0), 0);
  const shares = rows.reduce((a, q) => a + (Number(q.shares_count) || 0), 0);

  let topQuiz: { title: string; leads: number } | null = null;
  for (const q of rows) {
    const l = leadsByQuiz.get(q.id as string) ?? 0;
    if (!topQuiz || l > topQuiz.leads) topQuiz = { title: (q.title as string) ?? "", leads: l };
  }
  if (topQuiz && topQuiz.leads === 0) topQuiz = null;

  return { leads, views, completes, shares, topQuiz };
}
