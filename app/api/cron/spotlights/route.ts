// app/api/cron/spotlights/route.ts
// Chantier E : detecte les eleves qui atteignent un cap (mise en avant).
// Rafraichit leurs metriques, cree les candidats + brouillons, alerte
// l'admin par email. Auth : Bearer CRON_SECRET ou ?secret= (pattern Tiquiz).
import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { syncMetrics } from "@/lib/integrations/tiquiz";
import { checkSpotlights, type NewSpotlight } from "@/lib/spotlight";
import { sendEmail } from "@/lib/email/resend";
import { spotlightAdminEmail } from "@/lib/email/templates";
import { ADMIN_EMAILS } from "@/lib/adminEmails";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const CRON_SECRET = process.env.CRON_SECRET?.trim() || "";

function authOk(req: NextRequest): boolean {
  if (!CRON_SECRET) return false;
  const expected = Buffer.from(CRON_SECRET);
  const tryEqual = (received: string | null | undefined) => {
    if (!received) return false;
    const a = Buffer.from(received);
    if (a.length !== expected.length) return false;
    return timingSafeEqual(a, expected);
  };
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return tryEqual(auth.slice(7));
  return tryEqual(req.nextUrl.searchParams.get("secret"));
}

export async function GET(req: NextRequest) {
  if (!authOk(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { data: connections } = await supabaseAdmin
    .from("tiquiz_connections")
    .select("user_id");
  const userIds = (connections ?? []).map((c) => c.user_id as string);

  const created: NewSpotlight[] = [];
  for (const userId of userIds) {
    try {
      const { metrics } = await syncMetrics(userId); // rafraichit + badges
      const newOnes = await checkSpotlights(userId, metrics);
      created.push(...newOnes);
    } catch {
      // un eleve qui echoue ne bloque pas les autres
    }
  }

  if (created.length > 0) {
    // Noms pour le digest admin.
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email")
      .in(
        "id",
        created.map((c) => c.userId),
      );
    const nameById = new Map(
      (profiles ?? []).map((p) => [
        p.id as string,
        (p.full_name as string) || (p.email as string) || "Un élève",
      ]),
    );
    const items = created.map((c) => ({ name: nameById.get(c.userId) ?? "Un élève", label: c.label }));
    const { subject, html } = spotlightAdminEmail({ items });
    for (const to of ADMIN_EMAILS) {
      await sendEmail({ to, subject, html });
    }
  }

  return NextResponse.json({ ok: true, scanned: userIds.length, newCandidates: created.length });
}
