// lib/digest.ts : destinataires du récap hebdomadaire. Server-only.
// On ne relance QUE les élèves dont le parcours n'est pas fini (pas de
// spam aux diplômés), avec leur prochaine étape.
import "server-only";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export interface RecapRecipient {
  userId: string;
  email: string;
  firstName: string | null;
  dayNumber: number;
  dayTitle: string;
  completed: number;
  total: number;
}

export async function getWeeklyRecapRecipients(): Promise<RecapRecipient[]> {
  const { data: enrollments } = await supabaseAdmin
    .from("enrollments")
    .select("user_id")
    .eq("status", "active");
  const userIds = (enrollments ?? []).map((e) => e.user_id as string);
  if (userIds.length === 0) return [];

  const [{ data: profiles }, { data: days }, { data: progress }] = await Promise.all([
    supabaseAdmin.from("profiles").select("id, email, full_name").in("id", userIds),
    supabaseAdmin
      .from("days")
      .select("id, day_number, title")
      .eq("status", "published")
      .eq("is_bonus", false)
      .order("sort_order", { ascending: true }),
    supabaseAdmin
      .from("progress")
      .select("user_id, day_id, status")
      .in("user_id", userIds)
      .eq("status", "completed"),
  ]);

  const parcours = (days ?? []) as { id: string; day_number: number; title: string }[];
  if (parcours.length === 0) return [];

  const doneByUser = new Map<string, Set<string>>();
  for (const p of progress ?? []) {
    const uid = p.user_id as string;
    const set = doneByUser.get(uid) ?? new Set<string>();
    set.add(p.day_id as string);
    doneByUser.set(uid, set);
  }

  const recipients: RecapRecipient[] = [];
  for (const prof of (profiles ?? []) as { id: string; email: string | null; full_name: string | null }[]) {
    if (!prof.email) continue;
    const done = doneByUser.get(prof.id) ?? new Set<string>();
    const completed = parcours.filter((d) => done.has(d.id)).length;
    const total = parcours.length;
    if (completed >= total) continue; // parcours fini : pas de relance
    const current = parcours.find((d) => !done.has(d.id));
    if (!current) continue;
    recipients.push({
      userId: prof.id,
      email: prof.email,
      firstName: prof.full_name?.split(" ")[0] ?? null,
      dayNumber: current.day_number,
      dayTitle: current.title,
      completed,
      total,
    });
  }
  return recipients;
}
