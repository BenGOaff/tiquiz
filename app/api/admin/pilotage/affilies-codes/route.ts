// app/api/admin/pilotage/affilies-codes/route.ts
//
// Le bouton "attribuer les codes manquants" de la console. Il relaie
// vers l'espace affilié, qui tient le registre : le copier ici
// donnerait deux registres, donc deux réponses différentes le jour où
// l'un prend du retard.

import { NextResponse } from "next/server";

import { isAdminEmail } from "@/lib/adminEmails";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { attribuerCodesManquants } from "@/lib/pilotage/affilies";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(): Promise<NextResponse> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ ok: false, reason: "not_admin" }, { status: 403 });
  }
  return NextResponse.json(await attribuerCodesManquants());
}
