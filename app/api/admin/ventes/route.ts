// app/api/admin/ventes/route.ts
//
// LA LISTE DES VENTES DIRECTES DE TIQUIZ.
//
// Jumelle de celle de l'Atelier. Deux differences, et elles sont dans
// le schema, pas dans la logique :
//
//   1. La colonne d'horodatage s'appelle `received_at` ici et
//      `created_at` la-bas. On l'ALIASE dans la requete plutot que de
//      dupliquer la fonction de pliage : `buildSales` ne doit rien
//      savoir du nom des colonnes.
//   2. Tiquiz n'a pas de compte PayPal proprietaire, donc rien a
//      completer apres coup.

import { NextResponse } from "next/server";

import { isAdminEmail } from "@/lib/adminEmails";
import { buildSales, type EventRow } from "@/lib/checkout/sales";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from("webhook_logs")
    // `created_at:received_at` : l'alias PostgREST evite de faire porter
    // a la fonction pure une difference de nom de colonne entre les deux
    // depots.
    .select("source, event_type, payload, created_at:received_at")
    .in("source", ["stripe", "paypal"])
    .order("received_at", { ascending: false })
    .limit(500);

  if (error) {
    console.error("[admin/ventes] lecture impossible:", error.message);
    return NextResponse.json({ ok: false, reason: "read_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ventes: buildSales((data ?? []) as unknown as EventRow[]) });
}
