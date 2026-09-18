// lib/email/cadeauAtelierEmail.ts
//
// L'ENVOI DE LA RELANCE « L'ATELIER OFFERT ».
//
// Le TEXTE vit dans `cadeauAtelierContent.ts`, sans `server-only`, pour
// qu'un test puisse le lire. Ici il n'y a que l'appel réseau.
//
// Ne jette jamais : rend `false` et le DIT. L'appelant (le cron) a
// RÉSERVÉ la ligne avant d'appeler, exactement comme `churn-ask` : ce
// choix est expliqué là-bas, et il vaut ici pour la même raison.

import "server-only";

import { buildCadeauAtelierContent } from "./cadeauAtelierContent";
import { adresseExpediteur, tiquizFrom } from "./tiquizShell";

const RESEND_URL = "https://api.resend.com/emails";

export { buildCadeauAtelierContent };

export async function sendCadeauAtelierEmail(args: {
  email: string;
  prenom?: string | null;
  fenetre: "relance_6_mois" | "relance_1_an";
  finLe: string;
  lien: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.warn("[cadeauAtelierEmail] RESEND_API_KEY manquante, email non envoye.");
    return false;
  }
  if (!args.lien) {
    // Un email qui annonce un cadeau sans lien pour le prendre donne
    // l'air de se moquer. On n'envoie rien, et on le dit.
    console.error("[cadeauAtelierEmail] lien absent : email NON envoye.");
    return false;
  }

  // ADRESSE D'EXPÉDITION VÉRIFIÉE. Un repli sur un domaine non vérifié
  // fait refuser l'envoi par Resend sans que ça se voie (31 août).
  const fromEmail = adresseExpediteur();
  if (!fromEmail) {
    console.error("[cadeauAtelierEmail] aucune adresse d'expedition : email NON envoye.");
    return false;
  }

  try {
    const { subject, html, text } = buildCadeauAtelierContent({
      prenom: args.prenom ?? null,
      fenetre: args.fenetre,
      finLe: args.finLe,
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
        headers: { "X-Entity-Ref-ID": `cadeau-atelier-${args.fenetre}` },
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[cadeauAtelierEmail] Resend a refuse", res.status, body.slice(0, 200));
      return false;
    }
    return true;
  } catch (e) {
    console.error("[cadeauAtelierEmail] envoi impossible :", (e as Error).message);
    return false;
  }
}
