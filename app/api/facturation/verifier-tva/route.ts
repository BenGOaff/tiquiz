// app/api/facturation/verifier-tva/route.ts
//
// LE NUMÉRO DE TVA REMPLIT LE FORMULAIRE (Béné, 27 août 2026).
//
// "On peut faire que l'user rentre son numéro de tva et hop les données
// sont récupérées et tout ce qui doit être rempli l'est pour la
// facturation ?"
//
// Oui. VIES renvoie la raison sociale et l'adresse déclarées auprès de
// l'administration du pays : c'est plus juste qu'une saisie à la main,
// parce que c'est exactement ce que le fisc a dans ses fichiers.
//
// Et ça règle le vrai problème par la même occasion : le numéro est
// VÉRIFIÉ au moment où il est saisi, donc la personne apprend tout de
// suite qu'il est faux, au lieu de le découvrir des mois plus tard sur
// une facture avec de la TVA qu'elle n'attendait pas.
//
// -- POURQUOI UNE SESSION EST EXIGÉE -----------------------------------
//
// VIES est un service public gratuit, et lent. Ouvert sans session, ce
// point d'entrée deviendrait un moyen commode de vérifier des milliers
// de numéros depuis chez nous, ce qui nous ferait couper l'accès. Une
// personne connectée qui remplit son propre formulaire, c'est le débit
// que le service attend.
//
// -- ON NE DÉCIDE RIEN DE LA TVA ICI -----------------------------------
//
// Cette route RENSEIGNE. Le régime de TVA se décide au moment d'émettre
// la facture, par `resoudreTva`, avec un verdict demandé à ce moment là.
// Un verdict enregistré aujourd'hui et relu dans six mois désignerait
// une entreprise qui a peut-être fermé depuis.

import { NextRequest, NextResponse } from "next/server";

import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { interrogerVies } from "@/lib/facture/vies";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, reason: "not_signed_in" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { numero?: unknown };
  const numero = String(body.numero ?? "").trim();
  if (!numero) {
    return NextResponse.json({ ok: false, reason: "numero_absent" }, { status: 400 });
  }

  const { verdict, identite } = await interrogerVies(numero);
  // 200 dans les TROIS cas, y compris "injoignable" : ce n'est pas une
  // erreur de la personne, et l'écran a une phrase pour chacun. Un 500
  // l'enverrait chercher un problème chez elle.
  return NextResponse.json({ ok: true, verdict, identite });
}
