// app/api/admin/students/[userId]/access/route.ts
// Accorde ou révoque manuellement l'accès d'un élève (cas remboursement,
// offre manuelle, geste commercial). Action journalisée dans webhook_logs.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/adminGuard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resendAccessLinkByEmail } from "@/lib/access/grantAccess";

const schema = z.object({ action: z.enum(["grant", "revoke", "resend"]) });

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

  // Renvoi du lien d'accès (nouvel email brandé, sans toucher l'enrollment).
  if (parsed.data.action === "resend") {
    const { data: u } = await supabaseAdmin.auth.admin.getUserById(userId);
    const email = u?.user?.email ?? null;
    if (!email) return NextResponse.json({ ok: false, reason: "no_email" }, { status: 400 });
    const r = await resendAccessLinkByEmail(email);
    if (!r.ok) return NextResponse.json({ ok: false, reason: r.reason ?? "resend_failed" }, { status: 400 });
    await supabaseAdmin.from("webhook_logs").insert({
      source: "admin",
      event_type: "access_link_resend",
      payload: { user_id: userId, email, by: admin.email },
      status: "done",
    });
    return NextResponse.json({ ok: true });
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
