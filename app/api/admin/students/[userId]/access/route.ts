// app/api/admin/students/[userId]/access/route.ts
// Accorde ou révoque manuellement l'accès d'un élève (cas remboursement,
// offre manuelle, geste commercial). Action journalisée dans webhook_logs.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/adminGuard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const schema = z.object({ action: z.enum(["grant", "revoke"]) });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });

  const { userId } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, reason: "bad_body" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const isGrant = parsed.data.action === "grant";

  const { error } = await supabaseAdmin.from("enrollments").upsert(
    {
      user_id: userId,
      status: isGrant ? "active" : "revoked",
      source: "manual",
      granted_at: isGrant ? now : undefined,
      revoked_at: isGrant ? null : now,
    },
    { onConflict: "user_id" },
  );
  if (error) return NextResponse.json({ ok: false, reason: "db" }, { status: 400 });

  // Journalise l'action sensible (cf. spec admin, sécurité).
  await supabaseAdmin.from("webhook_logs").insert({
    source: "admin",
    event_type: isGrant ? "access_grant" : "access_revoke",
    payload: { user_id: userId, by: admin.email },
    status: "done",
  });

  return NextResponse.json({ ok: true });
}
