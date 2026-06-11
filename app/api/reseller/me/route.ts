// app/api/reseller/me/route.ts
//
// GET : le user connecté est-il un revendeur ACTIF ? Utilisé par la
// sidebar pour afficher (ou pas) l'entrée "Admin" vers /reseller.
// Ne révèle rien d'autre que le booléen + le nom du portefeuille :
// pour les clients normaux la réponse est is_reseller: false, sans
// différence observable avec un compte quelconque.

import { NextResponse } from "next/server";

import { getResellerSession } from "@/lib/reseller";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const session = await getResellerSession();
  if (!session) {
    return NextResponse.json({ ok: true, is_reseller: false });
  }
  return NextResponse.json({
    ok: true,
    is_reseller: true,
    name: session.reseller.name,
  });
}
