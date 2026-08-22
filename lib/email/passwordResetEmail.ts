// lib/email/passwordResetEmail.ts
//
// L'ENVOI DU "MOT DE PASSE OUBLIÉ". Le TEXTE vit dans
// `passwordResetContent.ts`, sans `server-only`, pour qu'un test puisse
// le lire.
//
// Demande Béné 31 juillet 2026 : "un bel email via resend, pas leur mail
// éclaté". Le lien est généré côté serveur (generateLink type recovery,
// aucun email Supabase) par `app/api/auth/forgot-password`.
//
// Best-effort : rend `false` si RESEND_API_KEY manque ou si l'envoi
// échoue. L'appelant bascule alors sur le template Supabase pour ne
// jamais laisser l'utilisatrice sans rien.

import "server-only";

import { buildPasswordResetContent } from "./passwordResetContent";
import { sendTiquizEmail } from "./tiquizSend";

export { buildPasswordResetContent };

/**
 * Envoie l'email de reset avec le lien d'action fourni. Retourne true si
 * envoyé via Resend, false sinon (l'appelant gère le fallback Supabase).
 */
export async function sendPasswordResetEmail(args: {
  email: string;
  actionLink: string;
  locale?: string | null;
}): Promise<boolean> {
  const { html, text, subject } = buildPasswordResetContent(args.actionLink, args.locale);
  return sendTiquizEmail({
    email: args.email,
    subject,
    html,
    text,
    refId: "password-reset",
    journal: "passwordResetEmail",
  });
}
