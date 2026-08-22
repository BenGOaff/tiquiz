// app/api/admin/support/tickets/route.ts
//
// LA FILE DU SUPPORT, ET LA RÉPONSE.
//
//   GET  ?email=  ->  { ok, tickets, resume }
//   PATCH { id, reponse? , status? }  ->  { ok }
//
// `?email=` sert la fiche client : les mêmes tickets, filtrés sur une
// personne. Une deuxième route aurait deux façons de lire un ticket, et
// deux façons finissent toujours par diverger.

import { NextRequest, NextResponse } from "next/server";

import { isAdminEmail } from "@/lib/adminEmails";
import { sendSupportReply } from "@/lib/email/supportReplyEmail";
import {
  readTicketStatus,
  resumerFile,
  statutApresReponse,
  trierFile,
  type Ticket,
} from "@/lib/support/tickets";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLONNES =
  "id, email, name, subject, message, page, status, admin_reply, replied_at, locale, created_at";

/** Combien de tickets on lit d'un coup. Au delà, la file se filtre. */
const LIMITE = 200;

async function garde(): Promise<boolean> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return Boolean(user && isAdminEmail(user.email));
}

/** Une ligne de base ramenée à la forme que les fonctions pures lisent. */
function versTicket(r: Record<string, unknown>): Ticket {
  return {
    id: String(r.id),
    email: String(r.email ?? ""),
    name: (r.name as string) ?? null,
    subject: (r.subject as string) ?? null,
    message: String(r.message ?? ""),
    page: (r.page as string) ?? null,
    status: readTicketStatus(r.status),
    adminReply: (r.admin_reply as string) ?? null,
    repliedAt: (r.replied_at as string) ?? null,
    locale: String(r.locale ?? "fr"),
    createdAt: String(r.created_at ?? ""),
  };
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!(await garde())) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }

  const email = (req.nextUrl.searchParams.get("email") ?? "").trim().toLowerCase();

  let q = supabaseAdmin
    .from("support_tickets")
    .select(COLONNES)
    .order("created_at", { ascending: false })
    .limit(LIMITE);
  if (email) q = q.eq("email", email);

  const { data, error } = await q;
  if (error) {
    // Tant que la migration n'est pas passée, la table n'existe pas.
    // L'écran doit le DIRE : une file vide se lit "personne ne t'écrit".
    console.warn(
      `[admin/support] file illisible (${error.message}). ` +
        `Si la table est absente, appliquer supabase/migrations/20260822_support_tickets.sql.`,
    );
    return NextResponse.json({ ok: false, reason: "table_absente", detail: error.message });
  }

  const tickets = trierFile((data ?? []).map((r) => versTicket(r as Record<string, unknown>)));
  return NextResponse.json({
    ok: true,
    tickets,
    resume: resumerFile(tickets, new Date()),
    tronque: tickets.length >= LIMITE,
  });
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  if (!(await garde())) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }

  let id = "";
  let reponse = "";
  let statutDemande = "";
  try {
    const body = await req.json();
    id = String(body?.id ?? "").trim();
    reponse = String(body?.reponse ?? "").trim().slice(0, 5000);
    statutDemande = String(body?.status ?? "").trim();
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_body" }, { status: 400 });
  }
  if (!id) return NextResponse.json({ ok: false, reason: "invalid_body" }, { status: 400 });

  const { data: ligne, error: errLire } = await supabaseAdmin
    .from("support_tickets")
    .select(COLONNES)
    .eq("id", id)
    .maybeSingle();
  if (errLire || !ligne) {
    return NextResponse.json({ ok: false, reason: "introuvable" }, { status: 404 });
  }
  const ticket = versTicket(ligne as Record<string, unknown>);

  // ── CHANGEMENT DE STATUT SEUL ──
  if (!reponse) {
    const statut = readTicketStatus(statutDemande);
    const { error } = await supabaseAdmin
      .from("support_tickets")
      .update({ status: statut })
      .eq("id", id);
    if (error) {
      return NextResponse.json({ ok: false, reason: "write_failed" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, status: statut });
  }

  // ── RÉPONSE : L'EMAIL D'ABORD, LA BASE ENSUITE ──
  //
  // L'ordre n'est pas un détail. Écrire "répondu" en base puis rater
  // l'envoi laisserait Béné convaincue d'avoir répondu et la cliente
  // devant une boîte vide : le pire des deux mondes, et en silence.
  // Dans l'autre sens, un email parti et une base qui n'a pas suivi
  // donne au pire une deuxième réponse, ce qui se voit et se répare.
  const parti = await sendSupportReply({
    email: ticket.email,
    reponse,
    question: ticket.message,
    sujet: ticket.subject,
    locale: ticket.locale,
  });
  if (!parti) {
    return NextResponse.json({ ok: false, reason: "email_failed" }, { status: 502 });
  }

  const { error } = await supabaseAdmin
    .from("support_tickets")
    .update({
      admin_reply: reponse,
      replied_at: new Date().toISOString(),
      // Répondre à un ticket CLOS ne le rouvre pas.
      status: statutApresReponse(ticket.status),
    })
    .eq("id", id);

  if (error) {
    // L'email est parti : on le DIT, au lieu de laisser croire que rien
    // ne s'est passé. Elle saura ne pas répondre deux fois.
    console.error(`[admin/support] reponse envoyee mais non enregistree (${id}) : ${error.message}`);
    return NextResponse.json({ ok: false, reason: "envoye_mais_non_enregistre" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
