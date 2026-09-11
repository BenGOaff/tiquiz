// lib/email/alerteAdmin.ts
//
// PRÉVENIR L'ADMIN : UN SEUL ENVOI, TOUJOURS.
//
// Porté de l'Atelier (25 août 2026). Là bas, trois chemins bouclaient sur
// `ADMIN_EMAILS` et Béné recevait chaque alerte en double, parce que les
// deux adresses de cette liste arrivent dans la même boîte. Ici, les
// trois alertes existantes envoyaient à `[...ADMIN_EMAILS]`, c'est à
// dire le même double.
//
// Une consigne ("n'oublie pas d'envoyer en un seul appel") est une
// demande. Ici, la boucle est simplement IMPOSSIBLE : il n'y a qu'un
// appel, et il prend la liste entière. Quand une erreur ne coûte rien à
// commettre et se voit des semaines plus tard, on la rend impossible, on
// ne demande pas d'y penser.
//
// Ne jette JAMAIS : une alerte qui échoue ne doit pas faire tomber le
// traitement qui l'a déclenchée (une vente encaissée, un webhook que le
// fournisseur rejouerait en boucle).

import "server-only";
import { ADMIN_ALERT_EMAILS } from "@/lib/adminEmails";
import { tiquizFrom } from "./tiquizShell";

const RESEND_URL = "https://api.resend.com/emails";

export async function alerterAdmins(args: {
  subject: string;
  html: string;
  /** Le texte brut, pour les clients mail qui ne lisent pas le HTML. */
  text?: string;
  /** L'adresse à laquelle répondre, quand une personne attend une réponse. */
  replyTo?: string | null;
  /** Un identifiant de famille, pour que Resend regroupe les envois. */
  refId?: string;
}): Promise<boolean> {
  if (ADMIN_ALERT_EMAILS.length === 0) {
    console.warn("[alerteAdmin] aucun destinataire configure :", args.subject);
    return false;
  }
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.warn("[alerteAdmin] RESEND_API_KEY manquante, alerte non envoyee :", args.subject);
    return false;
  }
  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: tiquizFrom(process.env, "Tiquiz"),
        to: [...ADMIN_ALERT_EMAILS],
        subject: args.subject,
        html: args.html,
        ...(args.text ? { text: args.text } : {}),
        ...(args.replyTo ? { reply_to: args.replyTo } : {}),
        ...(args.refId ? { headers: { "X-Entity-Ref-ID": args.refId } } : {}),
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[alerteAdmin] Resend a refuse", res.status, body.slice(0, 200));
      return false;
    }
    return true;
  } catch (e) {
    console.error(`[alerteAdmin] ${e instanceof Error ? e.message : String(e)}`);
    return false;
  }
}
