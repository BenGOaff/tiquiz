import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { StudentsTable, type StudentRow } from "@/components/admin/StudentsTable";

export const dynamic = "force-dynamic";

export default async function AdminElevesPage() {
  // Comptes auth (page 1, jusqu'à 1000 ; pagination à ajouter si besoin).
  // On récupère aussi last_sign_in_at (dernière connexion) pour le suivi.
  const { data: usersData } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const users = (usersData?.users ?? []) as Array<{
    id: string;
    email?: string | null;
    created_at: string;
    last_sign_in_at?: string | null;
  }>;

  const [
    { data: enrollments },
    { data: progress },
    { data: profiles },
    { count: totalDays },
    { data: conversions },
  ] = await Promise.all([
    supabaseAdmin.from("enrollments").select("user_id, status, granted_at"),
    supabaseAdmin.from("progress").select("user_id, status"),
    supabaseAdmin.from("profiles").select("id, full_name, sio_affiliate_id"),
    // Nombre de jours publiés = dénominateur de la progression.
    supabaseAdmin.from("days").select("id", { count: "exact", head: true }).eq("status", "published"),
    // Personnes amenées via le lien affilié de chaque élève (conversions).
    supabaseAdmin.from("affiliate_conversions").select("sa, email"),
  ]);

  const enrollByUser = new Map((enrollments ?? []).map((e) => [e.user_id as string, e]));
  const nameByUser = new Map((profiles ?? []).map((p) => [p.id as string, p.full_name as string | null]));
  const saByUser = new Map(
    (profiles ?? [])
      .filter((p) => (p.sio_affiliate_id as string | null)?.trim())
      .map((p) => [p.id as string, (p.sio_affiliate_id as string).trim()]),
  );
  const completedByUser = new Map<string, number>();
  for (const p of progress ?? []) {
    if (p.status === "completed") {
      completedByUser.set(p.user_id as string, (completedByUser.get(p.user_id as string) ?? 0) + 1);
    }
  }

  // Compte d'invités affiliés par sa : personnes DISTINCTES (email) amenées.
  const invitedBySa = new Map<string, Set<string>>();
  for (const c of conversions ?? []) {
    const sa = String((c as { sa?: string | null }).sa ?? "").trim();
    const email = String((c as { email?: string | null }).email ?? "").trim().toLowerCase();
    if (!sa || !email) continue;
    if (!invitedBySa.has(sa)) invitedBySa.set(sa, new Set());
    invitedBySa.get(sa)!.add(email);
  }

  const rows: StudentRow[] = users
    .map((u) => {
      const sa = saByUser.get(u.id) ?? null;
      return {
        userId: u.id,
        email: u.email ?? "(sans email)",
        fullName: nameByUser.get(u.id) ?? null,
        status: (enrollByUser.get(u.id)?.status as "active" | "revoked" | undefined) ?? null,
        completedDays: completedByUser.get(u.id) ?? 0,
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at ?? null,
        isAffiliate: !!sa,
        invitedCount: sa ? invitedBySa.get(sa)?.size ?? 0 : 0,
      };
    })
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Tes élèves</h1>
        <p className="text-sm text-muted-foreground">
          Dernière connexion, progression, accès et affiliation, en un clin d'oeil.
          Gestion manuelle (remboursement, offre directe) à droite. Ces données restent privées.
        </p>
      </header>
      <StudentsTable initialRows={rows} totalDays={totalDays ?? 7} />
    </div>
  );
}
