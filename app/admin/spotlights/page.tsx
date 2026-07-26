import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SpotlightActions } from "./SpotlightActions";

export const dynamic = "force-dynamic";

const MILESTONE_LABEL: Record<string, string> = {
  leads_10: "10 leads captés",
  leads_50: "50 leads captés",
};
const STATUS_LABEL: Record<string, string> = {
  candidate: "À traiter",
  published: "Publié",
  dismissed: "Écarté",
};

interface SpotlightRow {
  id: string;
  user_id: string;
  milestone: string;
  status: string;
  draft: string | null;
  created_at: string;
}

export default async function AdminSpotlightsPage() {
  const { data } = await supabaseAdmin
    .from("spotlights")
    .select("id, user_id, milestone, status, draft, created_at")
    .neq("status", "superseded")
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as SpotlightRow[];

  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const { data: profiles } = userIds.length
    ? await supabaseAdmin.from("profiles").select("id, full_name, email").in("id", userIds)
    : { data: [] };
  const nameById = new Map(
    (profiles ?? []).map((p) => [
      p.id as string,
      (p.full_name as string) || (p.email as string) || "Élève",
    ]),
  );

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Mises en avant</h1>
        <p className="text-sm text-muted-foreground">
          Les élèves qui ont atteint un vrai cap, avec un brouillon d'étude de cas prêt à relire.
          Tu valides, tu adaptes, tu publies (preuve sociale pour L'Atelier du Quiz et Tiquiz).
        </p>
      </header>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Aucun candidat pour l'instant. Ils apparaitront ici dès qu'un élève franchit un cap.
          </CardContent>
        </Card>
      ) : (
        rows.map((r) => (
          <Card key={r.id} className={r.status === "candidate" ? "border-primary/40" : undefined}>
            <CardContent className="flex flex-col gap-3 py-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display font-semibold">{nameById.get(r.user_id) ?? "Élève"}</span>
                <Badge>{MILESTONE_LABEL[r.milestone] ?? r.milestone}</Badge>
                <Badge variant={r.status === "candidate" ? "secondary" : "muted"}>
                  {STATUS_LABEL[r.status] ?? r.status}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString("fr-FR")}
                </span>
              </div>
              {r.draft ? (
                <div className="max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-surface-soft px-4 py-3 text-sm">
                  {r.draft}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Brouillon non généré (vérifie la clé ANTHROPIC_API_KEY).
                </p>
              )}
              <SpotlightActions id={r.id} draft={r.draft} />
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
