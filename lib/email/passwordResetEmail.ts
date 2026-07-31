// lib/email/passwordResetEmail.ts
//
// Email "mot de passe oublié" envoyé via Resend avec le template maison
// (demande Béné 31 juillet 2026 : "un bel email via resend, pas leur mail
// éclaté"). Le lien de reset est généré côté serveur (generateLink type
// recovery, aucun email Supabase) par app/api/auth/forgot-password.
//
// Best-effort : retourne false si RESEND_API_KEY manque ou si l'envoi
// échoue, l'appelant bascule alors sur le template Supabase standard
// (resetPasswordForEmail) pour ne jamais laisser l'utilisateur sans rien.
//
// Contenu localisé (7 locales, fallback fr). Jamais de tiret long.

import "server-only";

const RESEND_URL = "https://api.resend.com/emails";

interface ResetCopy {
  subject: string;
  heading: string;
  intro: string;
  cta: string;
  ignore: string;
  linkFallback: string;
  footer: string;
}

const COPY: Record<string, ResetCopy> = {
  fr: {
    subject: "Tiquiz : choisis ton nouveau mot de passe",
    heading: "Nouveau mot de passe",
    intro: "Tu as demandé à réinitialiser ton mot de passe Tiquiz. Clique sur le bouton ci-dessous pour en choisir un nouveau.",
    cta: "Choisir mon nouveau mot de passe",
    ignore: "Si tu n'es pas à l'origine de cette demande, ignore simplement cet email : ton mot de passe actuel reste valable.",
    linkFallback: "Si le bouton ne fonctionne pas, copie ce lien dans ton navigateur :",
    footer: "Tiquiz, l'outil de quiz de l'écosystème Tipote.",
  },
  en: {
    subject: "Tiquiz: choose your new password",
    heading: "New password",
    intro: "You asked to reset your Tiquiz password. Click the button below to choose a new one.",
    cta: "Choose my new password",
    ignore: "If you did not request this, just ignore this email: your current password stays valid.",
    linkFallback: "If the button does not work, copy this link into your browser:",
    footer: "Tiquiz, the quiz tool of the Tipote ecosystem.",
  },
  es: {
    subject: "Tiquiz: elige tu nueva contraseña",
    heading: "Nueva contraseña",
    intro: "Has pedido restablecer tu contraseña de Tiquiz. Haz clic en el botón de abajo para elegir una nueva.",
    cta: "Elegir mi nueva contraseña",
    ignore: "Si no has hecho esta solicitud, ignora este email: tu contraseña actual sigue siendo válida.",
    linkFallback: "Si el botón no funciona, copia este enlace en tu navegador:",
    footer: "Tiquiz, la herramienta de quiz del ecosistema Tipote.",
  },
  it: {
    subject: "Tiquiz: scegli la tua nuova password",
    heading: "Nuova password",
    intro: "Hai chiesto di reimpostare la tua password Tiquiz. Clicca sul pulsante qui sotto per sceglierne una nuova.",
    cta: "Scegliere la mia nuova password",
    ignore: "Se non hai fatto questa richiesta, ignora questa email: la tua password attuale resta valida.",
    linkFallback: "Se il pulsante non funziona, copia questo link nel tuo browser:",
    footer: "Tiquiz, lo strumento quiz dell'ecosistema Tipote.",
  },
  pt: {
    subject: "Tiquiz: escolhe a tua nova palavra-passe",
    heading: "Nova palavra-passe",
    intro: "Pediste para redefinir a tua palavra-passe Tiquiz. Clica no botão abaixo para escolher uma nova.",
    cta: "Escolher a minha nova palavra-passe",
    ignore: "Se não fizeste este pedido, ignora este email: a tua palavra-passe atual continua válida.",
    linkFallback: "Se o botão não funcionar, copia este link para o teu navegador:",
    footer: "Tiquiz, a ferramenta de quiz do ecossistema Tipote.",
  },
  "pt-BR": {
    subject: "Tiquiz: escolha sua nova senha",
    heading: "Nova senha",
    intro: "Você pediu para redefinir sua senha do Tiquiz. Clique no botão abaixo para escolher uma nova.",
    cta: "Escolher minha nova senha",
    ignore: "Se você não fez esse pedido, ignore este email: sua senha atual continua válida.",
    linkFallback: "Se o botão não funcionar, copie este link no seu navegador:",
    footer: "Tiquiz, a ferramenta de quiz do ecossistema Tipote.",
  },
  ar: {
    subject: "Tiquiz: اختر كلمة المرور الجديدة",
    heading: "كلمة مرور جديدة",
    intro: "طلبت إعادة تعيين كلمة مرور Tiquiz. اضغط على الزر أدناه لاختيار كلمة مرور جديدة.",
    cta: "اختيار كلمة المرور الجديدة",
    ignore: "إذا لم تقم بهذا الطلب، تجاهل هذا البريد: كلمة مرورك الحالية تبقى صالحة.",
    linkFallback: "إذا لم يعمل الزر، انسخ هذا الرابط في متصفحك:",
    footer: "Tiquiz، أداة الاختبارات في منظومة Tipote.",
  },
};

function pickCopy(locale?: string | null): ResetCopy {
  const l = (locale ?? "").trim();
  return COPY[l] ?? COPY[l.split("-")[0]] ?? COPY.fr;
}

function buildContent(actionLink: string, copy: ResetCopy): { html: string; text: string } {
  const html = `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#f6f7fb;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f2430;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7fb;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(31,36,48,0.08);">
        <tr><td style="background:linear-gradient(135deg,#0ea5c9,#20BBE6);padding:28px 32px;">
          <div style="color:#ffffff;font-size:13px;letter-spacing:.08em;text-transform:uppercase;opacity:.85;">Tiquiz</div>
          <div style="color:#ffffff;font-size:22px;font-weight:700;margin-top:6px;">${copy.heading}</div>
        </td></tr>
        <tr><td style="padding:28px 32px;">
          <p style="margin:0 0 20px;font-size:15px;line-height:1.6;">${copy.intro}</p>
          <div style="text-align:center;margin:24px 0 8px;">
            <a href="${actionLink}" style="display:inline-block;background:#20BBE6;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 26px;border-radius:9999px;">${copy.cta}</a>
          </div>
          <p style="margin:20px 0 0;font-size:13px;line-height:1.6;color:#5b6270;">${copy.ignore}</p>
          <p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:#8a8f9c;">${copy.linkFallback}<br />${actionLink}</p>
        </td></tr>
        <tr><td style="padding:18px 32px;border-top:1px solid #eef0f4;">
          <p style="margin:0;font-size:12px;color:#8a8f9c;">${copy.footer}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    copy.heading,
    "",
    copy.intro,
    "",
    `${copy.cta} : ${actionLink}`,
    "",
    copy.ignore,
    "",
    copy.footer,
  ].join("\n");

  return { html, text };
}

/**
 * Envoie l'email de reset avec le lien d'action fourni. Retourne true si
 * envoyé via Resend, false sinon (l'appelant gère le fallback Supabase).
 */
export async function sendPasswordResetEmail(args: {
  email: string;
  actionLink: string;
  locale?: string | null;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.warn("[passwordResetEmail] RESEND_API_KEY manquante, fallback Supabase.");
    return false;
  }
  const fromEmail =
    process.env.SUPPORT_FROM_EMAIL?.trim() ||
    process.env.RESELLER_FROM_EMAIL?.trim() ||
    "hello@tipote.com";

  try {
    const copy = pickCopy(args.locale);
    const { html, text } = buildContent(args.actionLink, copy);
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `Tiquiz <${fromEmail}>`,
        to: [args.email],
        subject: copy.subject,
        html,
        text,
        headers: { "X-Entity-Ref-ID": "password-reset" },
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[passwordResetEmail] Resend failed", res.status, body.slice(0, 200));
      return false;
    }
    return true;
  } catch (e) {
    console.error("[passwordResetEmail]", (e as Error).message);
    return false;
  }
}
