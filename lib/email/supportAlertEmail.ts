// lib/email/supportAlertEmail.ts
//
// UNE DEMANDE DE SUPPORT PRÉVIENT BÉNÉ TOUT DE SUITE.
//
// Même règle que l'alerte de vente refusée du 7 août : un écran qu'on
// n'ouvre pas ne prévient personne. Une cliente bloquée devant un
// paiement n'attendra pas que quelqu'un pense à consulter une file.
//
// Best-effort de bout en bout : un échec d'envoi ne change RIEN à la
// réponse faite à la cliente, puisque sa demande est déjà enregistrée.
// Lui répondre "erreur" parce que notre alerte n'est pas partie lui
// ferait renvoyer son message cinq fois.

import "server-only";

import { ADMIN_EMAILS } from "@/lib/adminEmails";
import { resolveAppUrl } from "@/lib/authLinks";
import { renderTiquizMessage, tiquizFrom } from "./tiquizShell";

const RESEND_URL = "https://api.resend.com/emails";

export interface SupportAlertArgs {
  email: string;
  name?: string | null;
  subject?: string | null;
  message: string;
  page?: string | null;
}

export async function sendSupportAlert(args: SupportAlertArgs): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.warn("[supportAlert] RESEND_API_KEY manquante : Béné n'est pas prévenue.");
    return false;
  }
  if (ADMIN_EMAILS.length === 0) return false;

  const appUrl = resolveAppUrl(process.env.NEXT_PUBLIC_APP_URL);
  const qui = [args.name, args.email].filter(Boolean).join(" - ");

  const { html, text } = renderTiquizMessage({
    subject: `Support : ${args.subject?.trim() || "nouvelle demande"}`,
    heading: "Nouvelle demande de support",
    paragraphes: [
      qui,
      args.page ? `Depuis : ${args.page}` : "",
      args.message,
      // Le lien direct vers la FICHE : d'un email a tout ce qu'on sait
      // d'elle, sans chercher dans la liste.
      `Sa fiche : ${appUrl}/admin/clients/${encodeURIComponent(args.email)}`,
    ].filter(Boolean),
    footer: "Répondre depuis l'onglet Support de l'admin Tiquiz.",
  });

  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: tiquizFrom(),
        to: [...ADMIN_EMAILS],
        // La cliente en copie cachée ? NON. Cet email contient un lien
        // vers son propre dossier admin : il ne sort pas de chez nous.
        reply_to: args.email,
        subject: `Support : ${args.subject?.trim() || "nouvelle demande"}`,
        html,
        text,
      }),
    });
    if (!res.ok) {
      console.error(`[supportAlert] Resend a refusé (${res.status}).`);
      return false;
    }
    return true;
  } catch (e) {
    console.error(`[supportAlert] ${e instanceof Error ? e.message : String(e)}`);
    return false;
  }
}
