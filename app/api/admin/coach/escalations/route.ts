// app/api/admin/coach/escalations/route.ts
// Marquer une escalade du coach comme résolue (admin only). La table
// coach_escalations est interne (RLS sans policy) : on écrit via service_role,
// après vérification serveur de l'admin (défense en profondeur au-delà du
// middleware /api/admin).
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/adminGuard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const schema = z.object({
  id: z.string().uuid(),
  resolved: z.boolean().default(true),
});

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, reason: "bad_body" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("coach_escalations")
    .update({ resolved: parsed.data.resolved })
    .eq("id", parsed.data.id);
  if (error) return NextResponse.json({ ok: false, reason: "db" }, { status: 400 });

  return NextResponse.json({ ok: true });
}
