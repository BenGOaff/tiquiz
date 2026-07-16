// lib/email/plusTrialEmail.ts
//
// Email de notification du mois Tiquiz Plus offert (opération "20 premiers
// inscrits à l'Atelier du Quiz"). Explique QUAND (date de fin) et POURQUOI
// (offre de lancement Atelier) le plan va changer, conformément à la
// demande de Béné.
//
// Deux variantes de contenu :
//   - Compte CRÉÉ pour l'occasion (pas de compte Tiquiz avant) : à la fin
//     du mois, le compte repasse en GRATUIT. On envoie donc aussi le lien
//     d'activation (invite) pour choisir le mot de passe.
//   - Compte EXISTANT (déjà free/mensuel/annuel) : à la fin du mois, retour
//     au plan PRÉCÉDENT. Lien magique d'entrée directe.
//
// Best-effort : si RESEND_API_KEY manque ou l'envoi échoue, on ne casse
// jamais l'octroi (le plan est déjà posé en DB). Jamais de tiret long.

import "server-only";

const RESEND_URL = "https://api.resend.com/emails";
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://quiz.tipote.com").trim().replace(/\/$/, "");

function formatFrDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

interface PlusTrialEmailArgs {
  email: string;
  /** ISO date de fin du trial (affiliate_trial_expires_at). */
  expiresAt: string;
  /** true = compte fraîchement créé (revient en gratuit). */
  createdAccount: boolean;
  /** Plan d'avant le trial (pour un compte existant payant). */
  prePlanLabel?: string | null;
  /** Lien d'action (invite/magiclink) pour entrer dans l'espace. */
  actionLink?: string | null;
}

function buildContent(args: PlusTrialEmailArgs): { subject: string; html: string; text: string } {
  const dateStr = formatFrDate(args.expiresAt);
  const cta = args.actionLink || `${APP_URL}/login`;
  const ctaLabel = args.createdAccount ? "Activer mon compte Tiquiz" : "Ouvrir mon espace Tiquiz";

  // Ce qui se passe à la fin du mois, selon le cas.
  const afterLine = args.createdAccount
    ? `Le ${dateStr}, ton compte repassera automatiquement en formule gratuite. Tu ne seras jamais débité, et tu gardes ton compte et tout ce que tu as créé.`
    : `Le ${dateStr}, ton compte reviendra automatiquement à ta formule précédente${
        args.prePlanLabel ? ` (${args.prePlanLabel})` : ""
      }. Rien à faire, aucun prélèvement lié à cette offre.`;

  const subject = "Ton mois Tiquiz Plus offert est activé";

  const html = `<!doctype html>
<html lang="fr">
<body style="margin:0;padding:0;background:#f6f7fb;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f2430;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7fb;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(31,36,48,0.08);">
        <tr><td style="background:linear-gradient(135deg,#4f46e5,#06b6d4);padding:28px 32px;">
          <div style="color:#ffffff;font-size:13px;letter-spacing:.08em;text-transform:uppercase;opacity:.85;">Atelier du Quiz</div>
          <div style="color:#ffffff;font-size:22px;font-weight:700;margin-top:6px;">Un mois de Tiquiz Plus, offert</div>
        </td></tr>
        <tr><td style="padding:28px 32px;">
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Bonne nouvelle : tu fais partie des premiers inscrits à l'Atelier du Quiz, et tu reçois <strong>1 mois au meilleur plan de Tiquiz (Plus), gratuitement</strong>.</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Tu as accès à tout ce que Plus débloque : multiprofils, analyse IA des résultats, et le reste, sans aucune limite pendant 30 jours.</p>
          <div style="background:#f1f5ff;border:1px solid #e0e7ff;border-radius:12px;padding:16px 18px;margin:0 0 20px;">
            <p style="margin:0;font-size:14px;line-height:1.6;color:#3730a3;"><strong>Ce qui se passe ensuite.</strong> ${afterLine}</p>
          </div>
          <div style="text-align:center;margin:24px 0 8px;">
            <a href="${cta}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 26px;border-radius:10px;">${ctaLabel}</a>
          </div>
          <p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:#8a8f9c;">Si le bouton ne fonctionne pas, copie ce lien dans ton navigateur : ${cta}</p>
        </td></tr>
        <tr><td style="padding:18px 32px;border-top:1px solid #eef0f4;">
          <p style="margin:0;font-size:12px;color:#8a8f9c;">Tiquiz, l'outil de quiz de l'écosystème Tipote.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    "Un mois de Tiquiz Plus, offert",
    "",
    "Tu fais partie des premiers inscrits a l'Atelier du Quiz, et tu recois 1 mois au meilleur plan de Tiquiz (Plus), gratuitement.",
    "Tu as acces a tout ce que Plus debloque (multiprofils, analyse IA des resultats, et le reste) sans limite pendant 30 jours.",
    "",
    `Ce qui se passe ensuite : ${afterLine}`,
    "",
    `${ctaLabel} : ${cta}`,
    "",
    "Tiquiz, l'outil de quiz de l'ecosysteme Tipote.",
  ].join("\n");

  return { subject, html, text };
}

/**
 * Envoie l'email de notification du mois Plus offert. Best-effort :
 * retourne true si envoyé, false sinon (jamais throw).
 */
export async function sendPlusTrialEmail(args: PlusTrialEmailArgs): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.warn("[plusTrialEmail] RESEND_API_KEY manquante, email non envoye.");
    return false;
  }
  const fromEmail =
    process.env.SUPPORT_FROM_EMAIL?.trim() ||
    process.env.RESELLER_FROM_EMAIL?.trim() ||
    "hello@tipote.com";

  try {
    const { subject, html, text } = buildContent(args);
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `Tiquiz <${fromEmail}>`,
        to: [args.email],
        subject,
        html,
        text,
        headers: { "X-Entity-Ref-ID": "plus-trial-atelier" },
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[plusTrialEmail] Resend failed", res.status, body.slice(0, 200));
      return false;
    }
    return true;
  } catch (e) {
    console.error("[plusTrialEmail]", (e as Error).message);
    return false;
  }
}
