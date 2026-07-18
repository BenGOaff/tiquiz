// app/api/integrations/tiquiz/disconnect/route.ts
// Deconnecte le compte Tiquiz de l'eleve (cas "mauvais compte"). Pose
// l'opt-out pour ne pas reconnecter automatiquement par email ensuite.
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { disconnect } from "@/lib/integrations/tiquiz";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, reason: "unauth" }, { status: 401 });

  await disconnect(user.id);
  return NextResponse.json({ ok: true });
}
