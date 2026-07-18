import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { StudentsTable, type StudentRow } from "@/components/admin/StudentsTable";

export const dynamic = "force-dynamic";

export default async function AdminElevesPage() {
  // Comptes auth (page 1, jusqu'à 1000 ; pagination à ajouter si besoin).
  const { data: usersData } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const users = (usersData?.users ?? []) as Array<{ id: string; email?: string | null; created_at: string }>;

  const [{ data: enrollments }, { data: progress }, { data: profiles }] = await Promise.all([
    supabaseAdmin.from("enrollments").select("user_id, status, granted_at"),
    supabaseAdmin.from("progress").select("user_id, status"),
    supabaseAdmin.from("profiles").select("id, full_name"),
  ]);

  const enrollByUser = new Map((enrollments ?? []).map((e) => [e.user_id as string, e]));
  const nameByUser = new Map((profiles ?? []).map((p) => [p.id as string, p.full_name as string | null]));
  const completedByUser = new Map<string, number>();
  for (const p of progress ?? []) {
    if (p.status === "completed") {
      completedByUser.set(p.user_id as string, (completedByUser.get(p.user_id as string) ?? 0) + 1);
    }
  }

  const rows: StudentRow[] = users
    .map((u) => ({
      userId: u.id,
      email: u.email ?? "(sans email)",
      fullName: nameByUser.get(u.id) ?? null,
      status: (enrollByUser.get(u.id)?.status as "active" | "revoked" | undefined) ?? null,
      completedDays: completedByUser.get(u.id) ?? 0,
      createdAt: u.created_at,
    }))
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Tes élèves</h1>
        <p className="text-sm text-muted-foreground">
          Progression, statut d'accès, et gestion manuelle (remboursement, offre directe).
          Ces données restent privées.
        </p>
      </header>
      <StudentsTable initialRows={rows} />
    </div>
  );
}
