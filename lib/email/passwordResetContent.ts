// lib/email/passwordResetContent.ts
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

// Aucun `server-only` ici : c'est du texte qui part sous le nom de Béné,
// il doit rester lisible par un test. L'ENVOI vit à côté.

import { pickCopy, renderTiquizEmail, type TiquizEmailCopy } from "./tiquizShell";

type ResetCopy = TiquizEmailCopy;

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

/** Le contenu seul, pour que les tests puissent le lire. */
export function buildPasswordResetContent(actionLink: string, locale?: string | null) {
  const copy = pickCopy(COPY, locale);
  return { ...renderTiquizEmail(actionLink, copy), subject: copy.subject };
}
