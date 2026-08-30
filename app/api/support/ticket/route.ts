// app/api/support/ticket/route.ts
//
// LE CHEMIN VERS UN HUMAIN.
//
//   POST { email, name?, subject?, message, page?, locale? } -> { ok }
//
// Le centre d'aide existe (57 articles, servis par Tipote), mais rien
// dans Tiquiz ne permettait d'écrire à quelqu'un. Une cliente bloquée
// n'avait que l'adresse email dans le pied de page, si elle la trouvait.
//
// -- POURQUOI CETTE ROUTE N'EXIGE PAS D'ÊTRE CONNECTÉE -----------------
//
// Parce que la personne qui a le plus besoin du support est justement
// celle qui n'arrive PAS à se connecter. Exiger une session ici, c'est
// fermer la porte à celle qui frappe.
//
// On garde quand même l'identité quand on l'a : si une session existe,
// son `user_id` part avec le ticket, et la fiche client le rattache
// tout de suite.
//
// -- ET DONC : UNE LIMITE PAR ADRESSE IP -------------------------------
//
// Une route publique qui écrit en base est une route qu'on inondera. La
// limite est volontairement basse et le refus est EXPLICITE (429 avec
// une raison) : un formulaire qui ne dit rien envoie la personne
// réessayer dix fois.

import { NextRequest, NextResponse } from "next/server";

import { sendSupportAlert } from "@/lib/email/supportAlertEmail";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { ecrireTicket, preparerTicket } from "@/lib/support/creerTicket";
import { creerLimiteur, ipDeLaRequete } from "@/lib/rateLimit/parIp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// LE COMPTEUR SE DÉSARMAIT TOUT SEUL (trouvé le 30 août 2026).
//
// Il faisait `compteur.clear()` dès que la table dépassait sa taille,
// donc il remettait à zéro le compteur de TOUT LE MONDE : un garde-fou
// qu'on peut désarmer en le remplissant n'en est pas un. L'audit du
// 24 août avait corrigé exactement ça côté Tipote, et la correction
// n'avait jamais été portée ici.
//
// La décision vit maintenant dans un module PUR et testé, partagé avec
// les autres routes publiques qui écrivent (cf. lib/rateLimit/parIp.ts).
const limiteur = creerLimiteur({ max: 5, fenetreMs: 3_600_000 });

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ip = ipDeLaRequete(req.headers);
  if (limiteur.trop(ip)) {
    return NextResponse.json({ ok: false, reason: "trop_de_demandes" }, { status: 429 });
  }

  let brut: Record<string, unknown>;
  try {
    brut = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_body" }, { status: 400 });
  }

  // Le nettoyage et la validation vivent dans `lib/support/creerTicket.ts`,
  // partages avec la porte du centre d'aide commun. Trois portes qui
  // valideraient chacune de leur cote finiraient par ne plus enregistrer
  // les memes champs.
  const prepare = preparerTicket({
    email: String(brut.email ?? ""),
    name: String(brut.name ?? ""),
    subject: String(brut.subject ?? ""),
    message: String(brut.message ?? ""),
    page: String(brut.page ?? ""),
    locale: String(brut.locale ?? "fr"),
    product: brut.product ?? "tiquiz",
    conversation: brut.conversation,
  });
  if (!prepare.ok) {
    return NextResponse.json({ ok: false, reason: prepare.reason }, { status: 400 });
  }
  const ticket = prepare.ticket;

  // L'identité si on l'a. Une absence de session n'est PAS une erreur.
  let userId: string | null = null;
  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    userId = null;
  }

  const ecrit = await ecrireTicket(ticket, userId);
  if (!ecrit.ok) {
    return NextResponse.json({ ok: false, reason: ecrit.reason }, { status: 500 });
  }

  // On prévient Béné. Best-effort : un email d'alerte qui ne part pas ne
  // doit pas faire croire à la cliente que sa demande a échoué, puisque
  // elle est bien enregistrée.
  await sendSupportAlert({
    email: ticket.email,
    name: ticket.name,
    subject: ticket.subject,
    message: ticket.message,
    page: ticket.page,
  }).catch(() => false);

  return NextResponse.json({ ok: true });
}
