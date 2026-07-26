import Link from "next/link";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EscalationResolveButton } from "@/components/admin/EscalationResolveButton";

export const dynamic = "force-dynamic";

interface EscalationRow {
  id: string;
  user_id: string;
  student_email: string | null;
  day_number: number | null;
  question: string;
  reason: string;
  resolved: boolean;
  created_at: string;
}

interface MessageRow {
  user_id: string;
  content: string;
  created_at: string;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminCoachJournalPage() {
  // Tout via service_role (tables internes / auth admin) : jamais déductible
  // du seul front, et l'accès est déjà gardé par le middleware /admin.
  const [{ data: usersData }, { data: escalationsData }, { data: messagesData }] =
    await Promise.all([
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      supabaseAdmin
        .from("coach_escalations")
        .select("id, user_id, student_email, day_number, question, reason, resolved, created_at")
        .order("created_at", { ascending: false })
        .limit(100),
      // Questions des élèves au coach (role=user) : usage réel, pour voir ce
      // qui revient et améliorer l'Atelier.
      supabaseAdmin
        .from("coach_messages")
        .select("user_id, content, created_at")
        .eq("role", "user")
        .order("created_at", { ascending: false })
        .limit(120),
    ]);

  const emailByUser = new Map<string, string>();
  for (const u of (usersData?.users ?? []) as Array<{ id: string; email?: string | null }>) {
    if (u.email) emailByUser.set(u.id, u.email);
  }
  const emailOf = (userId: string, snapshot?: string | null) =>
    emailByUser.get(userId) ?? snapshot ?? "élève inconnu";

  const escalations = (escalationsData ?? []) as EscalationRow[];
  const open = escalations.filter((e) => !e.resolved);
  const messages = (messagesData ?? []) as MessageRow[];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Link
          href="/admin/coach"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Réglages du coach
        </Link>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Journal du coach</h1>
        <p className="text-sm text-muted-foreground">
          Ce que les élèves demandent au coach, et les fois où il t'a fait remonter la main. Sert à
          voir comment il est utilisé et ce qu'il faut améliorer dans l'Atelier.
        </p>
      </header>

      {/* Escalades ouvertes : le coach n'a pas su, ou un bug a été signalé. */}
      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <AlertTriangle className="size-4" />
          À reprendre en main ({open.length})
        </h2>
        {open.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Rien à reprendre. Le coach gère.
            </CardContent>
          </Card>
        ) : (
          open.map((e) => (
            <Card key={e.id} className="border-primary/30">
              <CardContent className="flex flex-col gap-2 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{emailOf(e.user_id, e.student_email)}</Badge>
                  {e.day_number !== null && <Badge variant="muted">Jour {e.day_number}</Badge>}
                  <span className="text-xs text-muted-foreground">{fmtDate(e.created_at)}</span>
                  <div className="ml-auto">
                    <EscalationResolveButton id={e.id} />
                  </div>
                </div>
                <p className="text-sm">
                  <span className="font-semibold">Motif : </span>
                  {e.reason}
                </p>
                <div className="rounded-lg bg-muted/60 px-3 py-2">
                  <p className="whitespace-pre-wrap text-sm">{e.question}</p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </section>

      {/* Journal des questions : usage réel du coach. */}
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Questions récentes au coach
        </h2>
        {messages.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Aucune question posée au coach pour l'instant.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col divide-y divide-border py-1">
              {messages.map((m, i) => (
                <div key={i} className="flex flex-col gap-1 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      {emailOf(m.user_id)}
                    </span>
                    <span className="text-xs text-muted-foreground">{fmtDate(m.created_at)}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm">{m.content}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
