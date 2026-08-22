// lib/email/tiquizSend.ts
//
// L'ENVOI D'UN EMAIL TIQUIZ, ET RIEN D'AUTRE.
//
// Séparé de `tiquizShell.ts` pour UNE raison : ce fichier est
// `server-only` (il lit une clé d'API), donc le runner de tests ne peut
// pas le charger. Le CONTENU, lui, doit rester testable : c'est du texte
// qui part sous le nom de Béné.

import "server-only";

import { tiquizFrom } from "./tiquizShell";

const RESEND_URL = "https://api.resend.com/emails";

/**
 * Envoie via Resend. Ne jette jamais : rend `false` et le dit.
 *
 * L'appelant décide quoi faire d'un échec. Pour un email de connexion,
 * ne rien faire n'est pas une option : la personne attend devant sa
 * boîte.
 */
export async function sendTiquizEmail(args: {
  email: string;
  subject: string;
  html: string;
  text: string;
  /** Regroupe les envois du même type chez Resend. */
  refId: string;
  journal: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.warn(`[${args.journal}] RESEND_API_KEY manquante.`);
    return false;
  }
  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: tiquizFrom(),
        to: [args.email],
        subject: args.subject,
        html: args.html,
        text: args.text,
        headers: { "X-Entity-Ref-ID": args.refId },
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[${args.journal}] Resend a refuse`, res.status, body.slice(0, 200));
      return false;
    }
    return true;
  } catch (e) {
    console.error(`[${args.journal}]`, (e as Error).message);
    return false;
  }
}
