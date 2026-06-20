// app/api/reseller/me/route.ts
//
// GET : statut du user connecte pour la sidebar.
//  - is_admin    : email super-admin (gere les revendeurs, page /admin)
//  - is_reseller : revendeur ACTIF (son panel /reseller)
// Un client normal recoit les deux a false, sans difference observable.

import { NextResponse } from "next/server";

import { isAdminEmail } from "@/lib/adminEmails";
import { getResellerSession } from "@/lib/reseller";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const session = await getResellerSession();

  return NextResponse.json({
    ok: true,
    is_admin: isAdminEmail(user?.email),
    is_reseller: Boolean(session),
    name: session?.reseller.name ?? null,
  });
}
