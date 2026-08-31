// app/api/depart/route.ts
//
// ELLE ÉCRIT POURQUOI ELLE EST PARTIE.
//
//   POST { token, reason }  ->  { ok: true }
//                           ->  { ok: false, reason }
//
// -- CETTE ROUTE EST PUBLIQUE, ET C'EST VOULU --------------------------
//
// La personne n'est plus abonnée. Lui demander de se connecter pour
// répondre à une question qu'on lui pose serait le meilleur moyen de
// n'avoir aucune réponse. L'autorisation ne vient donc pas d'une
// session, elle vient du JETON SIGNÉ qu'elle a reçu par email.
//
// -- CE QUI EST VÉRIFIÉ, ET DANS QUEL ORDRE ----------------------------
//
// 1. le jeton est signé par NOUS (sinon n'importe qui écrirait dans le
//    départ de n'importe qui) ;
// 2. le texte est borné (une colonne n'est pas un dépotoir) ;
// 3. la ligne existe.
//
// **On n'écrit QUE la raison.** Pas l'email, pas la date d'annulation,
// pas le montant : le jeton autorise une seule chose, et une route qui
// en autorise plus que nécessaire finit par servir à autre chose.
//
// -- CE QU'ON NE FAIT PAS ----------------------------------------------
//
// On ne renvoie jamais l'adresse email ni le nom dans la réponse. Un
// jeton qui traîne dans un historique ne doit pas devenir un moyen de
// lire des données personnelles : il sert à ÉCRIRE, pas à lire.

import { NextRequest, NextResponse } from "next/server";

import { readChurnSecret, readChurnToken } from "@/lib/churn/replyToken";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Une réponse est un paragraphe, pas un roman. */
const MAX_LONGUEUR = 4000;

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: { token?: unknown; reason?: unknown };
  try {
    body = (await req.json()) as { token?: unknown; reason?: unknown };
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_body" }, { status: 400 });
  }

  const secret = readChurnSecret(process.env);
  const id = readChurnToken(typeof body.token === "string" ? body.token : null, secret);
  if (!id) {
    // 404 et pas 403 : on ne dit pas s'il existe un depart derriere ce
    // jeton. Meme regle que la porte du chantier de vente.
    return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404 });
  }

  const texte = String(typeof body.reason === "string" ? body.reason : "")
    .trim()
    .slice(0, MAX_LONGUEUR);
  if (!texte) {
    return NextResponse.json({ ok: false, reason: "empty" }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("subscription_churn")
      .update({
        reason: texte,
        answered_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id");
    if (error) throw error;
    if ((data ?? []).length === 0) {
      return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404 });
    }
  } catch (e) {
    console.error(
      `[depart] ecriture impossible : ${e instanceof Error ? e.message : String(e)}`,
    );
    // 502 : ce n'est pas sa faute, et elle doit pouvoir reessayer.
  // 200 ET PAS 5xx : LE CORPS DOIT ARRIVER (mesuré le 31 août 2026).
  // Cloudflare, qui sert nos six domaines, REMPLACE le corps d'un 502
  // par sa propre page (`error code: 502`, text/plain). L'écran lit la
  // RAISON, pas le statut : avec un 5xx il n'en recevait aucune et
  // affichait sa phrase par défaut. Mesuré deux fois, sur la newsletter
  // et sur l'inscription.
    return NextResponse.json({ ok: false, reason: "write_failed" });
  }

  return NextResponse.json({ ok: true });
}
