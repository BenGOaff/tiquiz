// app/api/admin/pilotage/traiter/route.ts
//
// MARQUER UNE ALERTE TRAITÉE, ET LA REMETTRE (Béné, 29 août 2026).
//
//   POST    { genre, reference, note? }  ->  l'alerte s'éteint
//   DELETE  ?genre=&reference=           ->  elle revient
//
// On n'écrit RIEN de la vente elle même : elle garde son montant, sa
// date, sa place dans les totaux et dans l'écran des ventes. C'est
// l'alerte qu'on éteint, pas l'argent qu'on efface.
//
// Et QUI a marqué est enregistré. Pas par méfiance : dans six mois,
// devant une vente sans compte et sans alerte, la seule question utile
// est "qui a décidé que c'était réglé, et quand".

import { NextRequest, NextResponse } from "next/server";

import { isAdminEmail } from "@/lib/adminEmails";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Les genres qu'on accepte. Une valeur libre finirait en base. */
const GENRES = new Set(["vente-orpheline"]);

async function admin(): Promise<string | null> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user && isAdminEmail(user.email) ? (user.email ?? "") : null;
}

function lire(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const email = await admin();
  if (email === null) return NextResponse.json({ ok: false, reason: "not_admin" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const genre = lire(body.genre);
  const reference = lire(body.reference);
  if (!GENRES.has(genre) || !reference) {
    return NextResponse.json({ ok: false, reason: "invalid_body" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("alertes_traitees").upsert(
    { genre, reference, traite_par: email, note: lire(body.note) || null },
    { onConflict: "genre,reference" },
  );
  if (error) {
    // Un `ok: false` produit TOUJOURS quelque chose à l'écran : sans
    // raison exploitable, un refus est indiscernable d'un clic perdu.
    const manquante = /alertes_traitees|schema cache|does not exist/i.test(error.message);
    console.error(`[pilotage/traiter] ecriture impossible : ${error.message}`);
    return NextResponse.json(
      { ok: false, reason: manquante ? "table_absente" : "write_failed" },
      { status: manquante ? 409 : 500 },
    );
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const email = await admin();
  if (email === null) return NextResponse.json({ ok: false, reason: "not_admin" }, { status: 403 });

  const genre = lire(req.nextUrl.searchParams.get("genre"));
  const reference = lire(req.nextUrl.searchParams.get("reference"));
  if (!GENRES.has(genre) || !reference) {
    return NextResponse.json({ ok: false, reason: "invalid_body" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("alertes_traitees")
    .delete()
    .eq("genre", genre)
    .eq("reference", reference);
  if (error) {
    console.error(`[pilotage/traiter] retrait impossible : ${error.message}`);
    return NextResponse.json({ ok: false, reason: "write_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
