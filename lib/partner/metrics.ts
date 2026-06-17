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

  const leadsByQuiz = new Map<string, number>();
  let leads = 0;
  if (ids.length > 0) {
    const { data: leadRows } = await supabaseAdmin
      .from("quiz_leads")
      .select("quiz_id")
      .in("quiz_id", ids);
    for (const r of leadRows ?? []) {
      const qid = (r as { quiz_id: string }).quiz_id;
      leads += 1;
      leadsByQuiz.set(qid, (leadsByQuiz.get(qid) ?? 0) + 1);
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
