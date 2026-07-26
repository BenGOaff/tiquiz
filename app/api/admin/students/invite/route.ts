// app/api/admin/students/invite/route.ts
// Invite manuellement un eleve (acces offert, ou test d'onboarding sans
// passer par un achat Systeme.io). Meme logique que le webhook.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/adminGuard";
import { grantAccessByEmail } from "@/lib/access/grantAccess";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const schema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, reason: "bad_email" }, { status: 400 });
  }
  const email = parsed.data.email.trim().toLowerCase();

  const result = await grantAccessByEmail(email, "manual");
  if (!result.ok) {
    return NextResponse.json({ ok: false, reason: result.reason }, { status: 400 });
  }

  await supabaseAdmin.from("webhook_logs").insert({
    source: "admin",
    event_type: "manual_invite",
    payload: { email, by: admin.email, created: result.created },
    status: "done",
  });

  return NextResponse.json({ ok: true, created: result.created });
}
