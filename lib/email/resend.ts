// lib/email/resend.ts
// Envoi d'emails transactionnels via l'API Resend. Server-only.
//
// Config requise dans le .env :
//   RESEND_API_KEY        cle API Resend (re_...)
//   FORMAQUIZ_EMAIL_FROM  expediteur sur le domaine verifie,
//                         ex: "L'Atelier du Quiz <bonjour@send.tipote.com>"
//                         (alias historique accepte : QUIZING_EMAIL_FROM)
//                         NB: le display-name est de toute facon force a
//                         "L'Atelier du Quiz" cote code (cf. withBrandName),
//                         seule l'adresse de l'env est utilisee.
// Optionnel :
//   FORMAQUIZ_REPLY_TO    adresse de reponse reellement relevee
//                         (ex: une boite que Bene lit). Sans ca, les
//                         reponses partent vers le domaine d'envoi et
//                         risquent de se perdre.
//                         (alias historique accepte : QUIZING_REPLY_TO)
//
// NB drame 19 juil 2026 : le .env prod nommait ces vars FORMAQUIZ_* alors
// que le code ne lisait que QUIZING_* -> "not_configured", aucun email
// d'invitation ne partait. On accepte desormais LES DEUX noms.
//
// L'envoi est best-effort : si la config manque ou que Resend renvoie une
// erreur, on log et on renvoie { ok:false } SANS jamais throw. Les appelants
// (octroi d'acces, reset) ne doivent pas echouer juste parce qu'un email
// n'est pas parti.
import "server-only";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RAW_EMAIL_FROM = process.env.FORMAQUIZ_EMAIL_FROM ?? process.env.QUIZING_EMAIL_FROM;
const REPLY_TO = process.env.FORMAQUIZ_REPLY_TO ?? process.env.QUIZING_REPLY_TO;

// Nom d'expediteur affiche = marque ACTUELLE, toujours. Le .env prod garde
// encore l'ancien libelle "FormaQuiz <...>" (rebrand non repercute), ce qui
// affichait "FormaQuiz" dans la boite de reception des eleves. On force donc
// le display-name cote code et on ne conserve de l'env QUE l'adresse verifiee.
const BRAND_FROM_NAME = "L'Atelier du Quiz";
function withBrandName(raw: string | undefined): string | undefined {
  if (!raw) return raw;
  const m = raw.match(/<([^>]+)>/);
  const address = (m ? m[1] : raw).trim();
  if (!address) return raw;
  return `${BRAND_FROM_NAME} <${address}>`;
}
const EMAIL_FROM = withBrandName(RAW_EMAIL_FROM);

export interface SendResult {
  ok: boolean;
  reason?: string;
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string | string[];
  subject: string;
  html: string;
}): Promise<SendResult> {
  if (!RESEND_API_KEY || !EMAIL_FROM) {
    console.error(
      "[email] RESEND_API_KEY ou FORMAQUIZ_EMAIL_FROM manquant. Email non envoye :",
      subject,
    );
    return { ok: false, reason: "not_configured" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to,
        subject,
        html,
        ...(REPLY_TO ? { reply_to: REPLY_TO } : {}),
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[email] envoi echoue", res.status, detail);
      return { ok: false, reason: `http_${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    console.error("[email] exception lors de l'envoi", err);
    return { ok: false, reason: "exception" };
  }
}
