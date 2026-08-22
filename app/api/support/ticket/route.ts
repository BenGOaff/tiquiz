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
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PAR_HEURE = 5;
const compteur = new Map<string, { n: number; jusqu: number }>();

function tropDeDemandes(ip: string): boolean {
  const now = Date.now();
  const vu = compteur.get(ip);
  if (!vu || now > vu.jusqu) {
    compteur.set(ip, { n: 1, jusqu: now + 3_600_000 });
    return false;
  }
  vu.n += 1;
  // Un ménage pour ne pas garder une entrée par IP indéfiniment.
  if (compteur.size > 5000) compteur.clear();
  return vu.n > MAX_PAR_HEURE;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "inconnue";
  if (tropDeDemandes(ip)) {
    return NextResponse.json({ ok: false, reason: "trop_de_demandes" }, { status: 429 });
  }

  let email = "";
  let name = "";
  let subject = "";
  let message = "";
  let page = "";
  let locale = "fr";
  try {
    const body = await req.json();
    email = String(body?.email ?? "").trim().toLowerCase().slice(0, 320);
    name = String(body?.name ?? "").trim().slice(0, 100);
    subject = String(body?.subject ?? "").trim().slice(0, 200);
    message = String(body?.message ?? "").trim().slice(0, 5000);
    page = String(body?.page ?? "").trim().slice(0, 300);
    locale = String(body?.locale ?? "fr").trim().slice(0, 8) || "fr";
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_body" }, { status: 400 });
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, reason: "invalid_email" }, { status: 400 });
  }
  if (message.length < 10) {
    // Dix caractères : de quoi refuser un formulaire envoyé par erreur,
    // sans jamais refuser une vraie question courte.
    return NextResponse.json({ ok: false, reason: "message_trop_court" }, { status: 400 });
  }

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

  const { error } = await supabaseAdmin.from("support_tickets").insert({
    user_id: userId,
    email,
    name: name || null,
    subject: subject || null,
    message,
    page: page || null,
    locale,
    status: "open",
  });

  if (error) {
    // Un refus se NOMME, et surtout il se JOURNALISE : une demande
    // perdue en silence, c'est une cliente qui attend une réponse qui ne
    // viendra jamais.
    console.error(`[support/ticket] demande PERDUE pour ${email} : ${error.message}`);
    return NextResponse.json({ ok: false, reason: "write_failed" }, { status: 500 });
  }

  // On prévient Béné. Best-effort : un email d'alerte qui ne part pas ne
  // doit pas faire croire à la cliente que sa demande a échoué, puisque
  // elle est bien enregistrée.
  await sendSupportAlert({ email, name, subject, message, page }).catch(() => false);

  return NextResponse.json({ ok: true });
}
