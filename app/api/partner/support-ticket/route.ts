// app/api/partner/support-ticket/route.ts
//
// LA PORTE DU CENTRE D'AIDE COMMUN ARRIVE ICI.
//
//   POST { email, message, product, ... }  ->  { ok }
//   header x-partner-secret
//
// Béné, 23 août : "je veux un service de ticketing dans le centre d'aide
// commun à toutes les app, essentiellement pour Tiquiz et L'Atelier,
// avec ticket relié à la fiche client si elle existe."
//
// -- POURQUOI LA PORTE EST LÀ-BAS ET LA FILE ICI -----------------------
//
// La porte doit être commune : quelqu'un qui n'a pas reçu ses accès ne
// sait pas sur quelle app écrire, et il ne devrait pas avoir à le
// savoir. Le centre d'aide (`app.tipote.com/support`) est déjà l'adresse
// partagée par les trois produits.
//
// La FILE, elle, doit être unique et vivre ici, parce que le ticket doit
// s'afficher sur la FICHE CLIENT, à côté de ses accès et de ses
// paiements, et que c'est l'admin de Tiquiz qui porte cette fiche (elle
// lit déjà les élèves de L'Atelier en lecture seule). Une donnée dans
// une autre base est une donnée qu'on ne croisera jamais.
//
// -- POURQUOI UN SECRET, ALORS QUE /api/support/ticket EST PUBLIQUE ----
//
// Pas pour la confidentialité : cette route n'ajoute aucun pouvoir. Pour
// la LIMITE PAR IP. Un relais serveur à serveur arrive toujours de la
// même adresse : la limite publique (5 par heure et par IP) couperait
// tout le centre d'aide dès la sixième personne de la journée. Tipote
// applique SA limite, par IP réelle, avant de relayer.

import { NextRequest, NextResponse } from "next/server";

import { sendSupportAlert } from "@/lib/email/supportAlertEmail";
import { ecrireTicket, preparerTicket } from "@/lib/support/creerTicket";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SHARED = (process.env.PARTNER_SHARED_SECRET ?? "").trim();

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!SHARED) {
    console.error("[partner/support-ticket] PARTNER_SHARED_SECRET absent : on refuse.");
    return NextResponse.json({ ok: false, reason: "not_configured" }, { status: 503 });
  }
  if ((req.headers.get("x-partner-secret") ?? "").trim() !== SHARED) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }

  let brut: Record<string, unknown>;
  try {
    brut = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_body" }, { status: 400 });
  }

  const prepare = preparerTicket({
    email: String(brut.email ?? ""),
    name: String(brut.name ?? ""),
    subject: String(brut.subject ?? ""),
    message: String(brut.message ?? ""),
    page: String(brut.page ?? ""),
    locale: String(brut.locale ?? "fr"),
    product: brut.product,
    conversation: brut.conversation,
  });
  if (!prepare.ok) {
    return NextResponse.json({ ok: false, reason: prepare.reason }, { status: 400 });
  }

  // Pas de `user_id` : la personne écrit depuis un autre domaine, elle
  // n'a pas de session ici. Le rattachement à sa fiche se fait par
  // l'ADRESSE, qui est toujours là. C'est déjà comme ça que la fiche
  // client retrouve ses tickets.
  const ecrit = await ecrireTicket(prepare.ticket, null);
  if (!ecrit.ok) {
    return NextResponse.json({ ok: false, reason: ecrit.reason }, { status: 500 });
  }

  await sendSupportAlert({
    email: prepare.ticket.email,
    name: prepare.ticket.name,
    subject: prepare.ticket.subject,
    message: prepare.ticket.message,
    page: prepare.ticket.page || `centre d'aide (${prepare.ticket.product})`,
  }).catch(() => false);

  console.log(
    `[partner/support-ticket] ticket ${prepare.ticket.product} de ${prepare.ticket.email} enregistre`,
  );
  return NextResponse.json({ ok: true });
}
