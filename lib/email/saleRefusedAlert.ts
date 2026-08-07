// lib/email/saleRefusedAlert.ts
//
// QUAND UNE VENTE EST ENCAISSÉE ET QUE L'ACCÈS EST REFUSÉ, BÉNÉ L'APPREND
// TOUT DE SUITE.
//
// -- CE QUI S'EST PASSÉ AVEC IVAN (7 août 2026) ------------------------
//
// Ivan Pellegry paie son abonnement mensuel. Le webhook ne reconnaît pas
// le bon de commande (ids neufs créés avec le nouveau prix), donc il
// REFUSE d'ouvrir l'accès. Ce refus est le bon comportement : on ne
// devine jamais un plan payant sur une offre inconnue.
//
// Le problème n'est pas le refus, c'est le SILENCE. La seule trace était
// une ligne dans `webhook_logs` et un `console.error` que personne ne lit.
// Béné l'a donc découvert par le client, le lendemain, et pendant ce temps
// toutes les autres ventes au nouveau prix tombaient pareil.
//
// C'est la même règle que pour la suppression d'un quiz le 3 août : **un
// refus doit produire quelque chose de visible.** Ici le destinataire
// n'est pas le client (il ne peut rien y faire) mais Béné, qui peut
// ouvrir l'accès en deux clics dans l'admin et corriger la table.
//
// Best-effort de bout en bout : un échec d'envoi ne doit JAMAIS changer la
// réponse au webhook, sinon Systeme.io rejouerait l'événement en boucle.

import "server-only";
import { ADMIN_EMAILS } from "@/lib/adminEmails";
import { resolveAppUrl } from "@/lib/authLinks";

const RESEND_URL = "https://api.resend.com/emails";

export interface SaleRefusedArgs {
  /** L'adresse qui a payé. */
  email: string;
  /** L'offer-price-id reçu, s'il y en avait un. */
  offerId: string | null;
  /** L'URL du tunnel reçue, s'il y en avait une. */
  sourceUrl: string | null;
  /** Le type d'événement Systeme.io. */
  eventType: string | null;
}

function echappe(v: string): string {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Prévient les admins qu'une vente encaissée n'a pas ouvert d'accès.
 *
 * L'email porte les DEUX identifiants reçus (l'id et l'URL), parce que ce
 * sont exactement les deux lignes à ajouter dans `lib/sio/webhookInference.ts`
 * pour que le prochain client passe.
 */
export async function sendSaleRefusedAlert(args: SaleRefusedArgs): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.warn("[saleRefusedAlert] RESEND_API_KEY manquante, alerte non envoyee.");
    return false;
  }
  const fromEmail =
    process.env.SUPPORT_FROM_EMAIL?.trim() ||
    process.env.RESELLER_FROM_EMAIL?.trim() ||
    "hello@tipote.com";
  const appUrl = resolveAppUrl(process.env.NEXT_PUBLIC_APP_URL);

  const offre = args.offerId ? echappe(args.offerId) : "(aucun reçu)";
  const url = args.sourceUrl ? echappe(args.sourceUrl) : "(aucune reçue)";
  const type = args.eventType ? echappe(args.eventType) : "(inconnu)";

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2340;font-size:15px;line-height:23px;">
      <h1 style="font-size:20px;margin:0 0 16px;">Une vente encaissée n'a pas ouvert d'accès</h1>
      <p style="margin:0 0 16px;"><strong>${echappe(args.email)}</strong> a payé, mais le bon de commande ne correspond à aucun plan connu. Son compte n'a pas été mis à jour.</p>
      <p style="margin:0 0 8px;">Ce que Systeme.io a envoyé :</p>
      <ul style="margin:0 0 16px;padding-left:20px;">
        <li>offer-price-id : <code>${offre}</code></li>
        <li>URL du tunnel : <code>${url}</code></li>
        <li>type d'événement : <code>${type}</code></li>
      </ul>
      <p style="margin:0 0 16px;"><strong>Tout de suite :</strong> ouvre le bon plan à la main dans l'admin, le client est débloqué.</p>
      <p style="margin:0 0 16px;"><strong>Ensuite :</strong> ces deux identifiants sont exactement les deux lignes à ajouter dans la table de routage pour que le prochain passe tout seul.</p>
      <p style="margin:0;"><a href="${appUrl}/admin" style="color:#5D6CDB;">Ouvrir l'admin Tiquiz</a></p>
    </div>`;

  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `Tiquiz <${fromEmail}>`,
        to: [...ADMIN_EMAILS],
        subject: `Vente encaissée sans accès : ${args.email}`,
        html,
        headers: { "X-Entity-Ref-ID": "sale-refused" },
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[saleRefusedAlert] Resend failed", res.status, body.slice(0, 200));
      return false;
    }
    return true;
  } catch (e) {
    console.error("[saleRefusedAlert]", (e as Error).message);
    return false;
  }
}
