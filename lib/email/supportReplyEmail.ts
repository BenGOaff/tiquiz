// lib/email/supportReplyEmail.ts
//
// L'ENVOI DE LA RÉPONSE DU SUPPORT. Le TEXTE vit dans
// `supportReplyContent.ts`, sans `server-only`, pour qu'un test le lise.

import "server-only";

import { buildSupportReplyContent } from "./supportReplyContent";
import { sendTiquizEmail } from "./tiquizSend";

export { buildSupportReplyContent };

/**
 * Rend `false` si l'envoi a échoué.
 *
 * L'appelant DOIT réagir : une réponse enregistrée en base mais jamais
 * partie laisse Béné convaincue d'avoir répondu, et la cliente devant sa
 * boîte vide. C'est le pire des deux mondes, et c'est silencieux.
 */
export async function sendSupportReply(args: {
  email: string;
  reponse: string;
  question: string;
  sujet?: string | null;
  locale?: string | null;
}): Promise<boolean> {
  const { html, text, subject } = buildSupportReplyContent(args);
  return sendTiquizEmail({
    email: args.email,
    subject,
    html,
    text,
    refId: "support-reply",
    journal: "supportReplyEmail",
  });
}
