// lib/email/responseNotification.ts
//
// Notification email au CRÉATEUR quand une nouvelle réponse / lead arrive
// sur un de ses quiz ou sondages. Best-effort : ne throw jamais, ne bloque
// jamais la capture. Respecte l'opt-out profiles.notify_responses.
//
// Envoi via Resend (fetch direct, même pattern que resellerEmail /
// plusTrialEmail). Si RESEND_API_KEY manque, on ne fait rien.
// Contenu FR, aucun tiret long (règle anti-IA).
import "server-only";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const RESEND_URL = "https://api.resend.com/emails";
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://quiz.tipote.com").trim().replace(/\/$/, "");

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Titres de quiz / résultats stockés en HTML riche (styles inline, spans
 * colorés). Dans l'email on veut le TEXTE seul : sinon le destinataire voit
 * le balisage brut (drame Gwenn 19 juil 2026). Ne change RIEN au rendu de
 * l'app, qui continue d'afficher le HTML stylé.
 */
function stripHtml(input: string | null | undefined): string {
  return String(input ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;|&rsquo;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export interface ResponseNotificationArgs {
  ownerUserId: string;
  quizId: string;
  quizTitle: string;
  /** "survey" pour un sondage, sinon quiz/scoring. */
  quizMode?: string | null;
  /** Email du répondant (null si réponse anonyme). */
  respondentEmail?: string | null;
  /** Nom du répondant si capturé. */
  respondentName?: string | null;
  /** Id du profil de résultat (quiz uniquement) : le titre est résolu ici. */
  resultId?: string | null;
}

/**
 * Envoie la notification au créateur. Best-effort, retourne true si envoyé.
 */
export async function notifyCreatorOfResponse(args: ResponseNotificationArgs): Promise<boolean> {
  try {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    if (!apiKey) return false;

    // Lire le profil du créateur : email + opt-out.
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email, notify_responses, first_name")
      .eq("user_id", args.ownerUserId)
      .maybeSingle();
    const p = profile as {
      email: string | null;
      notify_responses: boolean | null;
      first_name: string | null;
    } | null;
    if (!p?.email) return false;
    // Opt-out : seul false coupe (null/undefined = comportement par défaut activé).
    if (p.notify_responses === false) return false;

    const isSurvey = (args.quizMode ?? "") === "survey";
    const kind = isSurvey ? "ton sondage" : "ton quiz";
    const title = stripHtml(args.quizTitle) || (isSurvey ? "ton sondage" : "ton quiz");

    // Titre du profil de résultat (quiz uniquement), résolu à la volée.
    let resultTitle = "";
    if (!isSurvey && args.resultId) {
      const { data: r } = await supabaseAdmin
        .from("quiz_results")
        .select("title")
        .eq("id", args.resultId)
        .maybeSingle();
      resultTitle = stripHtml((r as { title?: string | null } | null)?.title);
    }

    // Qui a répondu.
    let whoLine: string;
    if (args.respondentName && args.respondentEmail) {
      whoLine = `${args.respondentName} (${args.respondentEmail})`;
    } else if (args.respondentEmail) {
      whoLine = args.respondentEmail;
    } else if (args.respondentName) {
      whoLine = args.respondentName;
    } else {
      whoLine = "Réponse anonyme (email non demandé)";
    }

    const link = `${APP_URL}/quiz/${args.quizId}/analytics`;
    const hello = p.first_name?.trim() ? `Salut ${p.first_name.trim()},` : "Salut,";
    const subject = `Nouvelle réponse sur ${title}`;

    const rows: string[] = [
      `<tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;">Qui</td><td style="padding:4px 0;font-size:14px;color:#111827;">${esc(whoLine)}</td></tr>`,
    ];
    if (resultTitle) {
      rows.push(
        `<tr><td style="padding:4px 0;color:#6b7280;font-size:13px;">Résultat</td><td style="padding:4px 0;font-size:14px;color:#111827;">${esc(resultTitle)}</td></tr>`,
      );
    }

    const html = `<!doctype html>
<html lang="fr">
<body style="margin:0;padding:0;background:#f6f7fb;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f2430;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7fb;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(31,36,48,0.08);">
        <tr><td style="background:linear-gradient(135deg,#4f46e5,#06b6d4);padding:24px 30px;">
          <div style="color:#ffffff;font-size:13px;letter-spacing:.06em;text-transform:uppercase;opacity:.85;">Tiquiz</div>
          <div style="color:#ffffff;font-size:20px;font-weight:700;margin-top:4px;">Nouvelle réponse 🎉</div>
        </td></tr>
        <tr><td style="padding:26px 30px;">
          <p style="margin:0 0 14px;font-size:15px;line-height:1.6;">${esc(hello)} tu viens de recevoir une nouvelle réponse sur <strong>${esc(title)}</strong> (${kind}).</p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #eef0f4;border-bottom:1px solid #eef0f4;margin:6px 0 20px;">${rows.join("")}</table>
          <div style="text-align:center;margin:22px 0 6px;">
            <a href="${link}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 24px;border-radius:10px;">Voir les réponses</a>
          </div>
        </td></tr>
        <tr><td style="padding:16px 30px;border-top:1px solid #eef0f4;">
          <p style="margin:0;font-size:12px;color:#8a8f9c;">Tu peux désactiver ces emails dans Réglages, section Notifications.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const text = [
      `${hello} tu viens de recevoir une nouvelle reponse sur ${title} (${kind}).`,
      "",
      `Qui : ${whoLine}`,
      resultTitle ? `Resultat : ${resultTitle}` : "",
      "",
      `Voir les reponses : ${link}`,
      "",
      "Tu peux desactiver ces emails dans Reglages, section Notifications.",
    ]
      .filter(Boolean)
      .join("\n");

    const fromEmail =
      process.env.SUPPORT_FROM_EMAIL?.trim() ||
      process.env.RESELLER_FROM_EMAIL?.trim() ||
      "hello@tipote.com";

    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `Tiquiz <${fromEmail}>`,
        to: [p.email],
        subject,
        html,
        text,
        headers: { "X-Entity-Ref-ID": "tiquiz-response-notification" },
      }),
    });
    if (!res.ok) {
      const b = await res.text().catch(() => "");
      console.error("[responseNotification] Resend failed", res.status, b.slice(0, 200));
      return false;
    }
    return true;
  } catch (e) {
    console.error("[responseNotification]", (e as Error).message);
    return false;
  }
}
