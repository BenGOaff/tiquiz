// app/api/admin/days/reorder/route.ts — réordonner les jours.
// Reçoit l'ordre voulu (liste d'ids) et réécrit sort_order par pas de 10.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/adminGuard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const schema = z.object({ orderedIds: z.array(z.string().uuid()).min(1) });

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, reason: "bad_body" }, { status: 400 });
  }

  // Met à jour chaque jour en série (peu de jours, pas besoin de batch).
  let i = 1;
  for (const id of parsed.data.orderedIds) {
    const { error } = await supabaseAdmin
      .from("days")
      .update({ sort_order: i * 10, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return NextResponse.json({ ok: false, reason: "db" }, { status: 400 });
    i += 1;
  }
  return NextResponse.json({ ok: true });
}
