// lib/email/churnAskEmail.ts
//
// L'ENVOI DE "POURQUOI TU PARS ?", ET UNE SEULE FOIS.
//
// Béné, 21 août : "qui a arrêté son abo : lui envoyer un mail pour lui
// demander pourquoi et consigner ces réponses pour level up l'outil."
//
// **Le TEXTE vit dans `churnAskContent.ts`**, sans `server-only`, pour
// qu'un test puisse le lire. Ici il n'y a que l'appel réseau.
//
// -- LE LIEN EST SIGNÉ, ET S'IL NE L'EST PAS L'EMAIL NE PART PAS -------
//
// La page de réponse écrit en base. Sans jeton signé, il n'y a pas de
// page à ouvrir : plutôt que d'envoyer un email sans lien (qui donnerait
// l'air de se moquer d'elle), on n'envoie rien et on le dit dans le
// journal. Voir `lib/churn/replyToken.ts`.

import "server-only";

import { buildChurnAskContent } from "./churnAskContent";
import { adresseExpediteur, tiquizFrom } from "./tiquizShell";

const RESEND_URL = "https://api.resend.com/emails";

export { buildChurnAskContent };

/**
 * Envoie l'email. Ne jette jamais : rend `false` et le DIT.
 *
 * L'appelant a déjà marqué la ligne comme "demandée" avant d'appeler
 * (voir le cron) : c'est un choix assumé, expliqué là-bas.
 */
export async function sendChurnAskEmail(args: {
  email: string;
  prenom?: string | null;
  lien: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.warn("[churnAskEmail] RESEND_API_KEY manquante, email non envoye.");
    return false;
  }
  if (!args.lien) {
    console.error("[churnAskEmail] lien de reponse absent : email NON envoye.");
    return false;
  }

  const fromEmail = adresseExpediteur();

  try {
    const { subject, html, text } = buildChurnAskContent({
      prenom: args.prenom ?? null,
      lien: args.lien,
    });
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: tiquizFrom(process.env, "Béné de Tiquiz"),
        to: [args.email],
        subject,
        html,
        text,
        headers: { "X-Entity-Ref-ID": "churn-ask" },
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[churnAskEmail] Resend a refuse", res.status, body.slice(0, 200));
      return false;
    }
    return true;
  } catch (e) {
    console.error("[churnAskEmail] envoi impossible :", (e as Error).message);
    return false;
  }
}
