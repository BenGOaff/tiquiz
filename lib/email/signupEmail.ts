// lib/email/signupEmail.ts
//
// L'ENVOI DE LA CONFIRMATION D'INSCRIPTION. Le TEXTE vit dans
// `signupContent.ts`, sans `server-only`, pour qu'un test puisse le lire.

import "server-only";

import { buildSignupContent } from "./signupContent";
import { sendTiquizEmail } from "./tiquizSend";

export { buildSignupContent };

/**
 * Rend `false` si l'envoi a échoué. L'appelant DOIT réagir : sans cet
 * email, la personne vient de créer un compte qu'elle ne peut pas
 * ouvrir, et elle n'a aucun moyen de le savoir.
 */
export async function sendSignupEmail(args: {
  email: string;
  actionLink: string;
  locale?: string | null;
}): Promise<boolean> {
  const { html, text, subject } = buildSignupContent(args.actionLink, args.locale);
  return sendTiquizEmail({
    email: args.email,
    subject,
    html,
    text,
    refId: "signup-confirm",
    journal: "signupEmail",
  });
}
